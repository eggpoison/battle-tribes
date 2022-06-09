import Board from "../Board";
import { RenderLayer } from "../entities/Entity";
import { ParticleSourceInfo } from "../particles/ParticleSource";
import { Point3, randFloat, Vector3 } from "../utils";

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
         damageOverTime: 2.5
      },
      particleSource: {
         spawnRate: 0.1,
         initialSpawnAmount: 0,
         particleInfo: {
            type: "rectangle",
            size: [5, 10],
            endSize: [25, 30],
            initialOffset: () => {
               const RANGE = 0.35;
               
               const offset = Vector3.randomUnitVector();
               offset.radius *= RANGE * Board.tileSize;
               return offset.convertToPoint();
            },
            initialVelocity: () => {
               const xVel = randFloat(-1, 1);
               const yVel = randFloat(-1, 1);
               const zVel = randFloat(0.5, 1);

               const velocity = new Point3(xVel, yVel, zVel);
               return velocity.convertToVector();
            },
            renderLayer: RenderLayer.HighParticles,
            initialAcceleration: FIRE_ACCELERATION,
            angularVelocity: 2,
            angularAcceleration: 10,
            colour: [255, 0, 0],
            endColour: [50, 0, 0],
            lifespan: [1.5, 2],
            endOpacity: 0,
            friction: 0.3,
            hasShadow: false
         }
      }
   }
}
export default STATUS_EFFECT_RECORD;