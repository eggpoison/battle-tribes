import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, TileIndex } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { AIType } from "../../components/AIHelperComponent";
import WanderAI from "../../ai/WanderAI";
import { Biome } from "../../../../shared/src/tiles";
import Layer from "../../Layer";

export const enum SlimewispVars {
   VISION_RANGE = 100
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.wanderAI
   | ServerComponentType.aiHelper
   | ServerComponentType.slimewisp;

const RADIUS = 16;

function tileIsValidCallback(_entity: EntityID, layer: Layer, tileIndex: TileIndex): boolean {
   return !layer.tileIsWall(tileIndex) && layer.getTileBiome(tileIndex) === Biome.swamp;
}

export function createSlimewispConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.slimewisp,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, RADIUS), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
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
         maxHealth: 3
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.poisoned
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: SlimewispVars.VISION_RANGE,
         ais: {
            [AIType.wander]: new WanderAI(100, Math.PI, 99999, tileIsValidCallback)
         }
      },
      [ServerComponentType.slimewisp]: {}
   };
}