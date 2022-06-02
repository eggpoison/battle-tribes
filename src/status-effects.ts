import { ParticleSourceInfo } from "./particles/ParticleSource";
import { Point3, randFloat } from "./utils";

export type StatusEffectType = "fire";

type StatusEffectInfo = {
   readonly effects: {
      /** Damage done to the entity over time */
      readonly damageOverTime?: number;
      /** How much slower the entity moves (calculated using: speed *= 1 - slow) */
      readonly slow?: number;
   }
   readonly particleSource?: Omit<ParticleSourceInfo, "position">;
}

const FIRE_ACCELERATION = new Point3(0, 0, 1).convertToVector();

const STATUS_EFFECT_RECORD: Record<StatusEffectType, StatusEffectInfo> = {
   fire: {
      effects: {
         damageOverTime: 1
      },
      particleSource: {
         spawnRate: 0.05,
         initialSpawnAmount: 0,
         particleInfo: {
            type: "rectangle",
            size: [5, 10],
            initialVelocity: () => {
               const xVel = randFloat(-1, 1);
               const yVel = randFloat(-1, 1);
               const zVel = randFloat(0.5, 1);

               const velocity = new Point3(xVel, yVel, zVel);
               return velocity.convertToVector();
            },
            initialAcceleration: FIRE_ACCELERATION,
            angularVelocity: 2,
            angularAcceleration: 10,
            colour: [255, 0, 0],
            endColour: [200, 200, 200],
            lifespan: [1.5, 2],
            endOpacity: 0,
            friction: 0.3
         }
      }
   }
}
export default STATUS_EFFECT_RECORD;