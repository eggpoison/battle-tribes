import { ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { UtilVars, randFloat, randInt } from "../../../shared/src/utils";
import { stopEntity, stopTurning } from "../ai-shared";
import { GuardianComponent, GuardianComponentArray } from "../components/GuardianComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { createGuardianSpikyBallConfig } from "../entities/projectiles/guardian-spiky-ball";
import { createEntityFromConfig } from "../Entity";
import { getTileIndexFromPos } from "../Layer";
import { getEntityLayer } from "../world";

const enum Vars {
   WINDUP_TIME_TICKS = (1.5 * Settings.TPS) | 0,
   FOCUS_DURATION_TICKS = (2.5 * Settings.TPS) | 0,
   RETURN_TIME_TICKS = (1 * Settings.TPS) | 0,

   LIMB_DIRECTION = UtilVars.PI * 0.5
}

const createSpikyBalls = (guardian: EntityID, target: EntityID): void => {
   const layer = getEntityLayer(guardian);
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   
   const numSpikyBalls = randInt(2, 3);
   for (let i = 0; i < numSpikyBalls; i++) {
      // Find a valid spawn spot for the spiky ball
      let hasFound = false;
      let x: number;
      let y: number;
      for (let attempts = 0; attempts < 50; attempts++) {
         const offsetMagnitude = randFloat(80, 196);
         const offsetDirection = 2 * Math.PI * Math.random();
         x = targetTransformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
         y = targetTransformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);

         const tileIndex = getTileIndexFromPos(x, y);
         if (!layer.tileIsWall(tileIndex)) {
            hasFound = true;
            break;
         }
      }
      
      if (hasFound) {
         const timeOffsetFactor = (i + 1) / (numSpikyBalls + 2);
         const spawnDelayTicks = Math.round(Vars.FOCUS_DURATION_TICKS * timeOffsetFactor);

         const velocityMagnitude = 100;
         const velocityDirection = 2 * Math.PI * Math.random();
         const vx = velocityMagnitude * Math.sin(velocityDirection);
         const vy = velocityMagnitude * Math.cos(velocityDirection);
         
         const config = createGuardianSpikyBallConfig();
         config[ServerComponentType.transform].position.x = x!;
         config[ServerComponentType.transform].position.y = y!;
         config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
         config[ServerComponentType.physics].velocityX = vx;
         config[ServerComponentType.physics].velocityY = vy;
         createEntityFromConfig(config, layer, spawnDelayTicks);
      }
   }
}

export default class GuardianSpikyBallSummonAI {
   private windupProgressTicks = 0;
   private focusProgressTicks = 0;
   private returnProgressTicks = 0;

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

   public run(guardian: EntityID, target: EntityID): void {
      const physicsComponent = PhysicsComponentArray.getComponent(guardian);
      stopEntity(physicsComponent);
      stopTurning(physicsComponent);

      // @Speed: should only do once at the start of the AI
      // this.setLimbDirection(guardian, Vars.LIMB_DIRECTION, GuardianVars.LIMB_ORBIT_RADIUS, guardianComponent);
      
      const guardianComponent = GuardianComponentArray.getComponent(guardian);
      if (this.windupProgressTicks < Vars.WINDUP_TIME_TICKS) {
         this.windupProgressTicks++;

         let progress = this.windupProgressTicks / Vars.WINDUP_TIME_TICKS;

         guardianComponent.setLimbGemActivations(0, 0, progress);
      } else if (this.focusProgressTicks < Vars.FOCUS_DURATION_TICKS) {
         // Create spiky balls
         if (this.focusProgressTicks === 0) {
            createSpikyBalls(guardian, target);
         }
         
         this.focusProgressTicks++;

         // Slam limbs together
         let progress = this.focusProgressTicks / Vars.FOCUS_DURATION_TICKS;
         progress = Math.pow(progress, 3/2);
      } else if (this.returnProgressTicks < Vars.RETURN_TIME_TICKS) {
         this.returnProgressTicks++;

         // Return limbs to normal
         let progress = this.returnProgressTicks / Vars.RETURN_TIME_TICKS;

         guardianComponent.setLimbGemActivations(0, 0, 1 - progress);
      } else {
         // @Incomplete: should instead reset the progress ticks when the attack is first being done
         // Attack is done!
         this.windupProgressTicks = 0;
         this.focusProgressTicks = 0;
         this.returnProgressTicks = 0;
         guardianComponent.resetAttackType(guardian);
      }
   }
}