import { GuardianCrystalBurstStage, ServerComponentType } from "battletribes-shared/components";
import { Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { lerp, Point, polarVec2, randAngle, randFloat, randSign, UtilVars } from "battletribes-shared/utils";
import { turnToPosition } from "../ai-shared";
import { GuardianComponent, GuardianComponentArray, GuardianVars } from "../components/GuardianComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { createGuardianGemFragmentProjectileConfig } from "../entities/projectiles/guardian-gem-fragment-projectile";
import { createEntity, getEntityLayer } from "../world";
import { Hitbox, addHitboxAngularVelocity, addHitboxVelocity } from "../hitboxes";

const enum Vars {
   WINDUP_TIME_TICKS = (1.5 * Settings.TICK_RATE) | 0,
   BURST_DURATION_TICKS = (2.5 * Settings.TICK_RATE) | 0,
   RETURN_TIME_TICKS = (1 * Settings.TICK_RATE) | 0,

   RESTING_LIMB_DIRECTION = UtilVars.PI * 0.5,
   BURST_LIMB_DIRECTION = UtilVars.PI * 0.3,

   FRAGMENTS_PER_SECOND = 60
}

const createFragmentProjectile = (guardian: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(guardian);
   const bodyHitbox = transformComponent.hitboxes[0];

   const offsetDirection = bodyHitbox.box.angle + randFloat(-0.2, 0.2);
   const offsetMagnitude = GuardianVars.LIMB_ORBIT_RADIUS;
   const originX = bodyHitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const originY = bodyHitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);

   const velocityMagnitude = randFloat(450, 700);
   const velocityDirection = offsetDirection + randFloat(-0.2, 0.2);
   const vel = polarVec2(velocityMagnitude, velocityDirection);
   
   const config = createGuardianGemFragmentProjectileConfig(new Point(originX, originY), randAngle(), guardian);

   const snowballHitbox = config.components[ServerComponentType.transform]!.hitboxes[0];
   addHitboxVelocity(snowballHitbox, vel);
   addHitboxAngularVelocity(snowballHitbox, randFloat(3.5 * Math.PI, 6 * Math.PI) * randSign());

   createEntity(config, getEntityLayer(guardian), 0);
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
      turnToPosition(guardian, new Point(targetX, targetY), this.turnSpeed, 1);

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

         if (Math.random() < Settings.DT_S * Vars.FRAGMENTS_PER_SECOND) {
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