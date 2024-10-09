import { GuardianCrystalBurstStage, ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { lerp, randFloat, randSign, UtilVars } from "../../../shared/src/utils";
import { stopEntity, turnToPosition } from "../ai-shared";
import { GuardianComponent, GuardianComponentArray, GuardianVars } from "../components/GuardianComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { createGuardianGemFragmentProjectileConfig } from "../entities/projectiles/guardian-gem-fragment-projectile";
import { createEntityFromConfig } from "../Entity";
import { getEntityLayer } from "../world";

const enum Vars {
   WINDUP_TIME_TICKS = (1.5 * Settings.TPS) | 0,
   BURST_DURATION_TICKS = (2.5 * Settings.TPS) | 0,
   RETURN_TIME_TICKS = (1 * Settings.TPS) | 0,

   RESTING_LIMB_DIRECTION = UtilVars.PI * 0.5,
   BURST_LIMB_DIRECTION = UtilVars.PI * 0.3,

   FRAGMENTS_PER_SECOND = 60
}

const createFragmentProjectile = (guardian: EntityID): void => {
   const transformComponent = TransformComponentArray.getComponent(guardian);

   const offsetDirection = transformComponent.rotation + randFloat(-0.2, 0.2);
   const offsetMagnitude = GuardianVars.LIMB_ORBIT_RADIUS;
   const originX = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const originY = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);

   const velocityMagnitude = randFloat(450, 700);
   const velocityDirection = offsetDirection + randFloat(-0.2, 0.2);
   const vx = velocityMagnitude * Math.sin(velocityDirection);
   const vy = velocityMagnitude * Math.cos(velocityDirection);
   
   const config = createGuardianGemFragmentProjectileConfig(guardian);
   config.components[ServerComponentType.transform].position.x = originX;
   config.components[ServerComponentType.transform].position.y = originY;
   config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   config.components[ServerComponentType.physics].externalVelocity.x = vx;
   config.components[ServerComponentType.physics].externalVelocity.y = vy;
   config.components[ServerComponentType.physics].angularVelocity = randFloat(3.5 * Math.PI, 6 * Math.PI) * randSign();
   createEntityFromConfig(config, getEntityLayer(guardian), 0);
}

export default class GuardianCrystalBurstAI {
   private readonly turnSpeed: number;

   private windupProgressTicks = 0;
   private burstProgressTicks = 0;
   private returnProgressTicks = 0;

   public stage = GuardianCrystalBurstStage.windup;
   public stageProgress = 0;
   
   constructor(turnSpeed: number) {
      this.turnSpeed = turnSpeed;
   }

   // @Copynpaste
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
      turnToPosition(guardian, targetX, targetY, this.turnSpeed);

      // Stop moving
      const physicsComponent = PhysicsComponentArray.getComponent(guardian);
      stopEntity(physicsComponent);
      
      const guardianComponent = GuardianComponentArray.getComponent(guardian);
      if (this.windupProgressTicks < Vars.WINDUP_TIME_TICKS) {
         this.windupProgressTicks++;
         this.stage = GuardianCrystalBurstStage.windup;

         let progress = this.windupProgressTicks / Vars.WINDUP_TIME_TICKS;
         this.stageProgress = progress;
         const limbDirection = lerp(Vars.RESTING_LIMB_DIRECTION, Vars.BURST_LIMB_DIRECTION, progress);
         this.setLimbDirection(guardian, limbDirection, GuardianVars.LIMB_ORBIT_RADIUS, guardianComponent);

         guardianComponent.setLimbGemActivations(guardian, 0, progress, 0);
      } else if (this.burstProgressTicks < Vars.BURST_DURATION_TICKS) {
         this.burstProgressTicks++;
         this.stage = GuardianCrystalBurstStage.burst;

         // Slam limbs together
         let progress = this.burstProgressTicks / Vars.BURST_DURATION_TICKS;
         this.stageProgress = progress;
         progress = Math.pow(progress, 3/2);
         this.setLimbDirection(guardian, Vars.BURST_LIMB_DIRECTION, GuardianVars.LIMB_ORBIT_RADIUS, guardianComponent);

         if (Math.random() < Settings.I_TPS * Vars.FRAGMENTS_PER_SECOND) {
            createFragmentProjectile(guardian);
         }
      } else if (this.returnProgressTicks < Vars.RETURN_TIME_TICKS) {
         this.returnProgressTicks++;
         this.stage = GuardianCrystalBurstStage.return;

         // Return limbs to normal
         let progress = this.returnProgressTicks / Vars.RETURN_TIME_TICKS;
         this.stageProgress = progress;
         const limbDirection = lerp(Vars.BURST_LIMB_DIRECTION, Vars.RESTING_LIMB_DIRECTION, progress);
         this.setLimbDirection(guardian, limbDirection, GuardianVars.LIMB_ORBIT_RADIUS, guardianComponent);

         guardianComponent.setLimbGemActivations(guardian, 0, 1 - progress, 0);
      } else {
         // @Incomplete: should instead reset the progress ticks when the attack is first being done
         // Attack is done!
         this.windupProgressTicks = 0;
         this.burstProgressTicks = 0;
         this.returnProgressTicks = 0;
         this.stage = GuardianCrystalBurstStage.windup;
         this.stageProgress = 0;
         guardianComponent.stopSpecialAttack(guardian);
      }
   }
}