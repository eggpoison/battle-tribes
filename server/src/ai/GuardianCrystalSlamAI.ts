import { GuardianCrystalSlamStage, ServerComponentType } from "battletribes-shared/components";
import { EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { lerp, UtilVars } from "battletribes-shared/utils";
import { moveEntityToPosition, stopEntity, turnToPosition } from "../ai-shared";
import { GuardianComponent, GuardianComponentArray, GuardianVars } from "../components/GuardianComponent";
import { applyAbsoluteKnockback, PhysicsComponentArray } from "../components/PhysicsComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { createGuardianGemQuakeConfig } from "../entities/guardian-gem-quake";
import { createEntityFromConfig } from "../Entity";
import { getEntityLayer } from "../world";

const enum Vars {
   WINDUP_TIME_TICKS = (1.5 * Settings.TPS) | 0,
   SLAM_TIME_TICKS = (0.3 * Settings.TPS) | 0,
   RETURN_TIME_TICKS = (1.1 * Settings.TPS) | 0,

   RESTING_LIMB_DIRECTION = UtilVars.PI * 0.5,
   SLAMMED_LIMB_DIRECTION = UtilVars.PI * 0.05,
   WINDUP_LIMB_DIRECTION = UtilVars.PI * 0.7,
   LIMB_EXTEND_AMOUNT = 16,

   QUAKE_ARC_SIZE = UtilVars.PI * 0.4
}

export default class GuardianCrystalSlamAI {
   private readonly acceleration: number;
   private readonly turnSpeed: number;
   
   private windupProgressTicks = 0;
   private slamProgressTicks = 0;
   private returnProgressTicks = 0;

   public stage = GuardianCrystalSlamStage.windup;
   public stageProgress = 0;

   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
   
   private slam(guardian: EntityID): void {
      // Push back the guardian
      const transformComponent = TransformComponentArray.getComponent(guardian);
      applyAbsoluteKnockback(guardian, 150, transformComponent.rotation + UtilVars.PI);

      const offsetMagnitude = GuardianVars.LIMB_ORBIT_RADIUS + Vars.LIMB_EXTEND_AMOUNT;
      const originX = transformComponent.position.x + offsetMagnitude * Math.sin(transformComponent.rotation);
      const originY = transformComponent.position.y + offsetMagnitude * Math.cos(transformComponent.rotation);
      
      // Create gem quakes
      const layer = getEntityLayer(guardian);
      for (let offsetIdx = 0; offsetIdx <= 10; offsetIdx++) {
         const o = offsetIdx + 2;

         const offset = o * 16;
         
         const numQuakes = Math.floor(Math.sqrt(o * 8));
         const halfIRange = (numQuakes - 1) / 2;
         for (let i = 0; i < numQuakes; i++) {
            const directionOffsetMultiplier = (i - halfIRange) / halfIRange;
            const direction = transformComponent.rotation + directionOffsetMultiplier * Vars.QUAKE_ARC_SIZE * 0.5;
   
            const spawnDelayTicks = Math.round(offsetIdx * 0.05 * Settings.TPS);
            
            let x = originX + offset * Math.sin(direction);
            let y = originY + offset * Math.cos(direction);

            // Add random offset to position
            const offsetMagnitude = 8 * Math.random();
            const offsetDirection = 2 * Math.PI * Math.random();
            x += offsetMagnitude * Math.sin(offsetDirection);
            y += offsetMagnitude * Math.cos(offsetDirection);
            
            const config = createGuardianGemQuakeConfig();
            config.components[ServerComponentType.transform].position.x = x;
            config.components[ServerComponentType.transform].position.y = y;
            config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
            createEntityFromConfig(config, layer, spawnDelayTicks);
         }
      }
   }

   private setLimbDirection(guardian: EntityID, direction: number, offset: number, guardianComponent: GuardianComponent): void {
      for (let i = 0; i < guardianComponent.limbHitboxes.length; i++) {
         const hitbox = guardianComponent.limbHitboxes[i];
         const box = hitbox.box;

         const limbDirection = direction * (i === 0 ? 1 : -1);
         box.offset.x = offset * Math.sin(limbDirection);
         box.offset.y = offset * Math.cos(limbDirection);
      }

      // @Copynpaste
      const physicsComponent = PhysicsComponentArray.getComponent(guardian);
      physicsComponent.hitboxesAreDirty = true;
   }
   
   public run(guardian: EntityID, targetX: number, targetY: number): void {
      const guardianComponent = GuardianComponentArray.getComponent(guardian);
      if (this.windupProgressTicks < Vars.WINDUP_TIME_TICKS) {
         this.windupProgressTicks++;
         this.stage = GuardianCrystalSlamStage.windup;

         // Keep moving to target
         moveEntityToPosition(guardian, targetX, targetY, this.acceleration, this.turnSpeed);
         
         let progress = this.windupProgressTicks / Vars.WINDUP_TIME_TICKS;
         this.stageProgress = progress;
         const limbDirection = lerp(Vars.RESTING_LIMB_DIRECTION, Vars.WINDUP_LIMB_DIRECTION, progress);
         this.setLimbDirection(guardian, limbDirection, GuardianVars.LIMB_ORBIT_RADIUS, guardianComponent);

         guardianComponent.setLimbGemActivations(guardian, progress, 0, 0);
      } else if (this.slamProgressTicks < Vars.SLAM_TIME_TICKS) {
         this.slamProgressTicks++;
         this.stage = GuardianCrystalSlamStage.slam;

         // Stop moving
         const physicsComponent = PhysicsComponentArray.getComponent(guardian);
         stopEntity(physicsComponent);

         // Slam limbs together
         let progress = this.slamProgressTicks / Vars.SLAM_TIME_TICKS;
         this.stageProgress = progress;
         progress = Math.pow(progress, 3/2);
         const limbDirection = lerp(Vars.WINDUP_LIMB_DIRECTION, Vars.SLAMMED_LIMB_DIRECTION, progress);
         const offset = GuardianVars.LIMB_ORBIT_RADIUS + progress * Vars.LIMB_EXTEND_AMOUNT;
         this.setLimbDirection(guardian, limbDirection, offset, guardianComponent);

         // Do the slam
         if (this.slamProgressTicks === Vars.SLAM_TIME_TICKS) {
            this.slam(guardian);
         }
      } else if (this.returnProgressTicks < Vars.RETURN_TIME_TICKS) {
         this.returnProgressTicks++;
         this.stage = GuardianCrystalSlamStage.return;

         // Look at target
         turnToPosition(guardian, targetX, targetY, this.turnSpeed);

         // Return limbs to normal
         let progress = this.returnProgressTicks / Vars.RETURN_TIME_TICKS;
         this.stageProgress = progress;
         progress = 1 - Math.pow(progress - 1, 2);
         const limbDirection = lerp(Vars.SLAMMED_LIMB_DIRECTION, Vars.RESTING_LIMB_DIRECTION, progress);
         const offset = GuardianVars.LIMB_ORBIT_RADIUS + Vars.LIMB_EXTEND_AMOUNT - progress * Vars.LIMB_EXTEND_AMOUNT;
         this.setLimbDirection(guardian, limbDirection, offset, guardianComponent);

         guardianComponent.setLimbGemActivations(guardian, 1 - progress, 0, 0);
      } else {
         // @Incomplete: should instead reset the progress ticks when the attack is first being done
         // Attack is done!
         this.windupProgressTicks = 0;
         this.slamProgressTicks = 0;
         this.returnProgressTicks = 0;
         this.stage = GuardianCrystalSlamStage.windup;
         this.stageProgress = 0;
         guardianComponent.stopSpecialAttack(guardian);
      }
   }
}