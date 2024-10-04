import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Point, randInt, TileIndex } from "battletribes-shared/utils";
import { createItemsOverEntity } from "../../entity-shared";
import { registerAttackingEntity } from "../../ai/escape-ai";
import { ItemType } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import WanderAI from "../../ai/WanderAI";
import { Biome } from "../../../../shared/src/tiles";
import Layer from "../../Layer";

export const enum KrumblidVars {
   VISION_RANGE = 224,
   MIN_FOLLOW_COOLDOWN = 7,
   MAX_FOLLOW_COOLDOWN = 9
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.wanderAI
   | ServerComponentType.escapeAI
   | ServerComponentType.followAI
   | ServerComponentType.krumblid;

const MAX_HEALTH = 15;
const KRUMBLID_SIZE = 48;

const FOLLOW_CHANCE_PER_SECOND = 0.3;

function tileIsValidCallback(_entity: EntityID, layer: Layer, tileIndex: TileIndex): boolean {
   return layer.tileIsWalls[tileIndex] === 0 && layer.tileBiomes[tileIndex] === Biome.desert;
}

export function createKrumblidConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.krumblid,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, KRUMBLID_SIZE / 2), 0.75, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
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
         maxHealth: MAX_HEALTH
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: KrumblidVars.VISION_RANGE,
         ais: [
            new WanderAI(200, 2 * Math.PI, 0.25, tileIsValidCallback)
         ]
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.escapeAI]: {},
      [ServerComponentType.followAI]: {
         followCooldownTicks: randInt(KrumblidVars.MIN_FOLLOW_COOLDOWN, KrumblidVars.MAX_FOLLOW_COOLDOWN),
         followChancePerSecond: FOLLOW_CHANCE_PER_SECOND,
         followDistance: 50
      },
      [ServerComponentType.krumblid]: {}
   };
}

export function onKrumblidHurt(cow: EntityID, attackingEntity: EntityID): void {
   registerAttackingEntity(cow, attackingEntity);
}

export function onKrumblidDeath(krumblid: EntityID): void {
   createItemsOverEntity(krumblid, ItemType.leather, randInt(2, 3), 30);
}