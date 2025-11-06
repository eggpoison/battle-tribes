import { assertBoxIsCircular } from "../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../shared/src/boxes/CircularBox";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { Point, polarVec2, randInt } from "../../../shared/src/utils";
import { createEntityConfigAttachInfoWithTether } from "../components";
import { AIHelperComponent, AIType } from "../components/AIHelperComponent";
import { HealthComponentArray } from "../components/HealthComponent";
import { getOkrenMandibleHitbox, OKREN_SIDES } from "../components/OkrenComponent";
import { SandBallComponentArray } from "../components/SandBallComponent";
import { detachHitbox, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { createSandBallConfig } from "../entities/desert/sand-ball";
import { applyAccelerationFromGround, Hitbox, turnHitboxToAngle, HitboxAngularTether, addHitboxAngularAcceleration } from "../hitboxes";
import { createEntity, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";

const MIN_BALLING_COOLDOWN_TICKS = 30 * Settings.TICK_RATE;
const MAX_BALLING_COOLDOWN_TICKS = 40 * Settings.TICK_RATE;

const MIN_BALL_TIME_TICKS = 1.5 * Settings.TICK_RATE;
const MAX_BALL_TIME_TICKS = 5 * Settings.TICK_RATE;

export class SandBallingAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;

   public readonly sandBallGrowRate: number;
   
   public ballingInterestCooldownTicks = Math.floor(randInt(MIN_BALLING_COOLDOWN_TICKS, MAX_BALLING_COOLDOWN_TICKS) * Math.random());

   public remainingBallTimeTicks = 0;

   public isTurningClockwise = true;
   
   constructor(acceleration: number, turnSpeed: number, sandBallGrowRate: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
      this.sandBallGrowRate = sandBallGrowRate;
   }
}

export function updateSandBallingAI(sandBallingAI: SandBallingAI): void {
   if (sandBallingAI.ballingInterestCooldownTicks > 0) {
      sandBallingAI.ballingInterestCooldownTicks--;
   }
}

export function shouldRunSandBallingAI(sandBallingAI: SandBallingAI): boolean {
   return sandBallingAI.ballingInterestCooldownTicks === 0;
}

export function getSandBallMass(sizeInteger: number): number {
   return 0.2 * sizeInteger;
}

const getCurrentSandBall = (transformComponent: TransformComponent): Entity | null => {
   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.sandBall) {
            return childHitbox.entity;
         }
      }
   }
   return null;
}

export function runSandBallingAI(entity: Entity, aiHelperComponent: AIHelperComponent, sandBallingAI: SandBallingAI): void {
   aiHelperComponent.currentAIType = AIType.sandBalling;

   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = entityTransformComponent.hitboxes[0];
   assertBoxIsCircular(entityHitbox.box);

   const currentSandBall = getCurrentSandBall(entityTransformComponent);
   if (currentSandBall !== null) {
      // Continue ballin in the lords name

      const sandBall = currentSandBall;

      const sandBallTransformComponent = TransformComponentArray.getComponent(sandBall);
      const sandBallHitbox = sandBallTransformComponent.hitboxes[0];

      if ((getEntityAgeTicks(entity) % Math.floor(Settings.TICK_RATE / 2)) === 0 && Math.random() < 0.5 / (Settings.TICK_RATE / 2)) {
         sandBallingAI.isTurningClockwise = !sandBallingAI.isTurningClockwise;
      }

      // switche
      if (sandBallingAI.isTurningClockwise) {
         addHitboxAngularAcceleration(entityHitbox, sandBallingAI.turnSpeed);
         addHitboxAngularAcceleration(sandBallHitbox, sandBallingAI.turnSpeed);
      } else {
         addHitboxAngularAcceleration(entityHitbox, -sandBallingAI.turnSpeed);
         addHitboxAngularAcceleration(sandBallHitbox, -sandBallingAI.turnSpeed);
      }

      // move forwards
      applyAccelerationFromGround(entityHitbox, polarVec2(sandBallingAI.acceleration, entityHitbox.box.angle));

      const sandBallComponent = SandBallComponentArray.getComponent(sandBall);

      const previousSizeCategory = Math.floor(sandBallComponent.size);
      
      // grow balls
      sandBallComponent.size += sandBallingAI.sandBallGrowRate * Settings.DT_S / sandBallComponent.size;
      // (max size)
      if (sandBallComponent.size > 6) {
         sandBallComponent.size = 6;
         detachHitbox(sandBallHitbox);
      } else if (--sandBallingAI.remainingBallTimeTicks <= 0) {
         detachHitbox(sandBallHitbox);
      }

      const newSizeCategory = Math.floor(sandBallComponent.size);
      if (newSizeCategory !== previousSizeCategory) {
         const healthComponent = HealthComponentArray.getComponent(sandBall);
         healthComponent.maxHealth++;
         healthComponent.health++;
         (sandBallHitbox.box as CircularBox).radius += 2;
         sandBallHitbox.mass = getSandBallMass(newSizeCategory);
         sandBallTransformComponent.isDirty = true;
      }

      // Wiggle mandibles
      // @HACK @COPYNPASTE
      if (getEntityType(entity) === EntityType.krumblid) {
         for (let i = 0; i < 2; i++) {
            // @Hack
            const mandibleHitbox = entityTransformComponent.hitboxes[i + 1];
            const idealAngle = ((getEntityAgeTicks(entity) * 3.2 + (i === 0 ? Settings.TICK_RATE * 0.35 : 0)) % Settings.TICK_RATE) * Settings.DT_S < 0.5 ? -Math.PI * 0.3 : Math.PI * 0.1;
            turnHitboxToAngle(mandibleHitbox, idealAngle, 3 * Math.PI, 0.5, true);
         }
      } else if (getEntityType(entity) === EntityType.okren) {
         for (let i = 0; i < 2; i++) {
            const side = OKREN_SIDES[i];
            const mandibleHitbox = getOkrenMandibleHitbox(entity, side);
            if (mandibleHitbox !== null) {
               const idealAngle = ((getEntityAgeTicks(entity) * 3.2 + (i === 0 ? Settings.TICK_RATE * 0.35 : 0)) % Settings.TICK_RATE) * Settings.DT_S < 0.5 ? -Math.PI * 0.4 : Math.PI * 0.2;
               turnHitboxToAngle(mandibleHitbox, idealAngle, 20 * Math.PI, 0.05, true);
            }
         }
      } else {
         throw new Error();
      }
   } else {
      // Start a new ball

      let offsetMagnitude = entityHitbox.box.radius + 8;
      // @Hack: cuz the okren hitbox doesn't fully cover its front!!
      if (getEntityType(entity) === EntityType.okren) {
         offsetMagnitude += 20;
      }
      const x = entityHitbox.box.position.x + offsetMagnitude * Math.sin(entityHitbox.box.angle);
      const y = entityHitbox.box.position.y + offsetMagnitude * Math.cos(entityHitbox.box.angle);
      
      const ballConfig = createSandBallConfig(new Point(x, y), entityHitbox.box.angle);

      const ballHitbox = ballConfig.components[ServerComponentType.transform]!.hitboxes[0];
      const angularTether: HitboxAngularTether = {
         originHitbox: entityHitbox,
         idealAngle: 0,
         springConstant: 10,
         damping: 0.4,
         padding: 0,
         idealHitboxAngleOffset: 0,
         useLeverage: false
      };
      ballHitbox.angularTethers.push(angularTether);

      ballConfig.attachInfo = createEntityConfigAttachInfoWithTether(ballHitbox, entityHitbox, offsetMagnitude, 10, 0.4, false, false);
      
      createEntity(ballConfig, getEntityLayer(entity), 0);

      sandBallingAI.remainingBallTimeTicks = randInt(MIN_BALL_TIME_TICKS, MAX_BALL_TIME_TICKS);
   }
}