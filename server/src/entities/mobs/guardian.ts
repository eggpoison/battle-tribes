import { createHitbox, Hitbox, HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID, EntityType } from "../../../../shared/src/entities";
import { Point, TileIndex } from "../../../../shared/src/utils";
import GuardianAI from "../../ai/GuardianAI";
import GuardianCrystalBurstAI from "../../ai/GuardianCrystalBurstAI";
import GuardianCrystalSlamAI from "../../ai/GuardianCrystalSlamAI";
import GuardianSpikyBallSummonAI from "../../ai/GuardianSpikyBallSummonAI ";
import WanderAI from "../../ai/WanderAI";
import { ComponentConfig } from "../../components";
import { AIType } from "../../components/AIHelperComponent";
import { getGuardianLimbOrbitRadius, GuardianComponentArray } from "../../components/GuardianComponent";
import Layer from "../../Layer";

const enum Vars {
   VISION_RANGE = 300
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.wanderAI
   | ServerComponentType.guardian;

const createGuardianHitboxes = (): Array<Hitbox> => {
   const hitboxes = new Array<Hitbox>();

   hitboxes.push(createHitbox(new CircularBox(new Point(0, 0), 0, 40), 1.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []));

   // Limbs
   const limbOrbitRadius = getGuardianLimbOrbitRadius();
   for (let i = 0; i < 2; i++) {
      hitboxes.push(createHitbox(new CircularBox(new Point(limbOrbitRadius * (i === 0 ? 1 : -1), 0), 0, 14), 0.7, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.GUARDIAN_LIMB_HITBOX]));
   }

   return hitboxes;
}

function tileIsValidCallback(entity: EntityID, _layer: Layer, tileIndex: TileIndex): boolean {
   const guardianComponent = GuardianComponentArray.getComponent(entity);
   return guardianComponent.homeTiles.includes(tileIndex);
}

export function createGuardianConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.guardian,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createGuardianHitboxes()
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByAirFriction: true,
         isAffectedByGroundFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 60
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: Vars.VISION_RANGE,
         ais: {
            [AIType.wander]:                  new WanderAI(200, Math.PI * 0.5, 0.6, tileIsValidCallback),
            [AIType.guardian]:                new GuardianAI(280, Math.PI * 0.5),
            [AIType.guardianCrystalSlam]:     new GuardianCrystalSlamAI(200, Math.PI * 0.3),
            [AIType.guardianCrystalBurst]:    new GuardianCrystalBurstAI(Math.PI * 0.5),
            [AIType.guardianSpikyBallSummon]: new GuardianSpikyBallSummonAI()
         }
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.guardian]: {
         homeTiles: []
      }
   };
}