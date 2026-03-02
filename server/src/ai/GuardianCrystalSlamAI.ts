import { GuardianCrystalSlamStage } from "battletribes-shared/components";
import { Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { lerp, Point, polarVec2, randAngle, UtilVars } from "battletribes-shared/utils";
import { moveEntityToPosition, turnToPosition } from "../ai-shared";
import { GuardianComponent, GuardianComponentArray, GuardianVars } from "../components/GuardianComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { createGuardianGemQuakeConfig } from "../entities/guardian-gem-quake";
import { createEntity, getEntityLayer } from "../world";
import { applyAbsoluteKnockback } from "../hitboxes";

const enum Vars {
   WINDUP_TIME_TICKS = (1.5 * Settings.TICK_RATE) | 0,
   SLAM_TIME_TICKS = (0.3 * Settings.TICK_RATE) | 0,
   RETURN_TIME_TICKS = (1.1 * Settings.TICK_RATE) | 0,

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
   
   private slam(guardian: Entity): void {
      // Push back the guardian
      const transformComponent = TransformComponentArray.getComponent(guardian);
      const bodyHitbox = transformComponent.hitboxes[0];
      
      applyAbsoluteKnockback(bodyHitbox, polarVec2(150, bodyHitbox.box.angle + Math.PI));

      const offsetMagnitude = GuardianVars.LIMB_ORBIT_RADIUS + Vars.LIMB_EXTEND_AMOUNT;
      const originX = bodyHitbox.box.position.x + offsetMagnitude * Math.sin(bodyHitbox.box.angle);
      const originY = bodyHitbox.box.position.y + offsetMagnitude * Math.cos(bodyHitbox.box.angle);
      
      // Create gem quakes
      const layer = getEntityLayer(guardian);
      for (let offsetIdx = 0; offsetIdx <= 10; offsetIdx++) {
         const o = offsetIdx + 2;

         const offset = o * 16;
         
         const numQuakes = Math.floor(Math.sqrt(o * 8));
         const halfIRange = (numQuakes - 1) / 2;
         for (let i = 0; i < numQuakes; i++) {
            const directionOffsetMultiplier = (i - halfIRange) / halfIRange;
            const direction = bodyHitbox.box.angle + directionOffsetMultiplier * Vars.QUAKE_ARC_SIZE * 0.5;
   
            const spawnDelayTicks = Math.round(offsetIdx * 0.05 * Settings.TICK_RATE);
            
            let x = originX + offset * Math.sin(direction);
            let y = originY + offset * Math.cos(direction);

            // Add random offset to position
            const offsetMagnitude = 8 * Math.random();
            const offsetDirection = randAngle();
            x += offsetMagnitude * Math.sin(offsetDirection);
            y += offsetMagnitude * Math.cos(offsetDirection);
            
            const config = createGuardianGemQuakeConfig(new Point(x, y), randAngle());
            createEntity(config, layer, spawnDelayTicks);
         }
      }
   }

   private setLimbDirection(guardian: Entity, direction: number, offset: number, guardianComponent: GuardianComponent): void {
      for (let i = 0; i < guardianComponent.limbHitboxes.length; i++) {
         const hitbox = guardianComponent.limbHitboxes[i];
         const box = hitbox.box;

         const limbDirection = direction * (i === 0 ? 1 : -1);
         box.offset.x = offset * Math.sin(limbDirection);
         box.offset.y = offset * Math.cos(limbDirection);
      }

      // @Copynpaste
      const transformComponent = TransformComponentArray.getComponent(guardian);
      transformComponent.isDirty = true;
   }
   
   public run(guardian: Entity, targetX: number, targetY: number): void {
      const guardianComponent = GuardianComponentArray.getComponent(guardian);
      if (this.windupProgressTicks < Vars.WINDUP_TIME_TICKS) {
         this.windupProgressTicks++;
         this.stage = GuardianCrystalSlamStage.windup;

         // Keep moving to target
         moveEntityToPosition(guardian, targetX, targetY, this.acceleration, this.turnSpeed, 1);
         
         let progress = this.windupProgressTicks / Vars.WINDUP_TIME_TICKS;
         this.stageProgress = progress;
         const limbDirection = lerp(Vars.RESTING_LIMB_DIRECTION, Vars.WINDUP_LIMB_DIRECTION, progress);
         this.setLimbDirection(guardian, limbDirection, GuardianVars.LIMB_ORBIT_RADIUS, guardianComponent);

         guardianComponent.setLimbGemActivations(guardian, progress, 0, 0);
      } else if (this.slamProgressTicks < Vars.SLAM_TIME_TICKS) {
         this.slamProgressTicks++;
         this.stage = GuardianCrystalSlamStage.slam;

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
         turnToPosition(guardian, new Point(targetX, targetY), this.turnSpeed, 1);

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