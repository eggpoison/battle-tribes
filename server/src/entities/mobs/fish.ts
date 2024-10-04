import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Point, randInt, TileIndex } from "battletribes-shared/utils";
import { HealthComponentArray } from "../../components/HealthComponent";
import { FishComponentArray } from "../../components/FishComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { registerAttackingEntity } from "../../ai/escape-ai";
import { TribeMemberComponentArray } from "../../components/TribeMemberComponent";
import { ItemType } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import WanderAI from "../../ai/WanderAI";
import { AIType } from "../../components/AIHelperComponent";
import { Biome, TileType } from "../../../../shared/src/tiles";
import Layer from "../../Layer";
import { Settings } from "../../../../shared/src/settings";
import { TransformComponentArray } from "../../components/TransformComponent";

const enum Vars {
   TILE_VALIDATION_PADDING = 20
}

export const enum FishVars {
   VISION_RANGE = 200
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.wanderAI
   | ServerComponentType.escapeAI
   | ServerComponentType.aiHelper
   | ServerComponentType.fish;

const FISH_WIDTH = 7 * 4;
const FISH_HEIGHT = 14 * 4;

const positionIsOnlyNearWater = (layer: Layer, x: number, y: number): boolean => {
   const minTileX = Math.max(Math.floor((x - Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), 0);
   const maxTileX = Math.min(Math.floor((x + Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
   const minTileY = Math.max(Math.floor((y - Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), 0);
   const maxTileY = Math.min(Math.floor((y + Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         if (layer.getTileXYBiome(tileX, tileY) !== Biome.river) {
            return false;
         }
      }
   }

   return true;
}

function tileIsValidCallback(entity: EntityID, layer: Layer, x: number, y: number): boolean {
   const tileIndex = layer.getTileIndexFromPos(x, y);
   if (layer.tileIsWall(tileIndex) || layer.getTileBiome(tileIndex) !== Biome.river) {
      return false;
   }

   if (!positionIsOnlyNearWater(layer, x, y)) {
      return false;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   if (!layer.tileRaytraceMatchesTileTypes(transformComponent.position.x, transformComponent.position.y, x, y, [TileType.water])) {
      return false;
   }

   return true;
}

export function createFishConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.fish,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), FISH_WIDTH, FISH_HEIGHT, 0), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
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
         maxHealth: 5
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.escapeAI]: {},
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: FishVars.VISION_RANGE,
         ais: {
            [AIType.wander]: new WanderAI(200, Math.PI, 0.6, tileIsValidCallback)
         }
      },
      [ServerComponentType.fish]: {
         colour: randInt(0, 3)
      }
   };
}

// @Cleanup: shouldn't be exported
export function unfollowLeader(fish: EntityID, leader: EntityID): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(leader);
   const idx = tribeMemberComponent.fishFollowerIDs.indexOf(fish);
   if (idx !== -1) {
      tribeMemberComponent.fishFollowerIDs.splice(idx, 1);
   }
}

export function onFishLeaderHurt(fish: EntityID, attackingEntity: EntityID): void {
   if (HealthComponentArray.hasComponent(attackingEntity)) {
      const fishComponent = FishComponentArray.getComponent(fish);
      fishComponent.attackTargetID = attackingEntity;
   }
}

export function onFishHurt(fish: EntityID, attackingEntity: EntityID): void {
   registerAttackingEntity(fish, attackingEntity);
}

export function onFishDeath(fish: EntityID): void {
   createItemsOverEntity(fish, ItemType.raw_fish, 1, 40);
}