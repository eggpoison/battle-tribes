import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { BerryBushComponentData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { BerryBushComponentArray, HealthComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { createItemEntity } from "../item-entity";
import Board from "../../Board";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { getEntityPlantGatherMultiplier } from "../tribes/tribe-member";

export const BERRY_BUSH_RADIUS = 40;

/** Number of seconds it takes for a berry bush to regrow one of its berries */
const BERRY_GROW_TIME = 30;

export function createBerryBush(position: Point): Entity {
   const berryBush = new Entity(position, EntityType.berryBush, COLLISION_BITS.plants, DEFAULT_COLLISION_MASK);
   berryBush.rotation = 2 * Math.PI * Math.random();

   const hitbox = new CircularHitbox(berryBush.position.x, berryBush.position.y, 1, 0, 0, HitboxCollisionType.soft, BERRY_BUSH_RADIUS, berryBush.getNextHitboxLocalID(), berryBush.rotation);
   berryBush.addHitbox(hitbox);

   HealthComponentArray.addComponent(berryBush.id, new HealthComponent(10));
   StatusEffectComponentArray.addComponent(berryBush.id, new StatusEffectComponent(0));
   BerryBushComponentArray.addComponent(berryBush.id, {
      numBerries: 5,
      berryGrowTimer: 0
   });

   return berryBush;
}

export function tickBerryBush(berryBush: Entity): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(berryBush.id);
   if (berryBushComponent.numBerries >= 5) {
      return;
   }

   berryBushComponent.berryGrowTimer += Settings.I_TPS;
   if (berryBushComponent.berryGrowTimer >= BERRY_GROW_TIME) {
      // Grow a new berry
      berryBushComponent.berryGrowTimer = 0;
      berryBushComponent.numBerries++;
   }
}

export function dropBerryOverEntity(entity: Entity): void {
   // Generate new spawn positions until we find one inside the board
   let position: Point;
   let spawnDirection: number;
   do {
      // @Speed: Garbage collection
      position = entity.position.copy();

      spawnDirection = 2 * Math.PI * Math.random();
      const spawnOffset = Point.fromVectorForm(40, spawnDirection);

      position.add(spawnOffset);
   } while (!Board.isInBoard(position));

   const itemEntity = createItemEntity(position, ItemType.berry, 1, 0);
   
   const velocityDirectionOffset = (Math.random() - 0.5) * Math.PI * 0.15
   itemEntity.velocity.x = 40 * Math.sin(spawnDirection + velocityDirectionOffset);
   itemEntity.velocity.y = 40 * Math.cos(spawnDirection + velocityDirectionOffset);
}

export function dropBerry(berryBush: Entity, attackingEntity: Entity | null): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(berryBush.id);
   if (berryBushComponent.numBerries === 0) {
      return;
   }

   const gatherMultiplier = attackingEntity !== null ? getEntityPlantGatherMultiplier(attackingEntity, berryBush) : 1;
   const numDroppedBerries = Math.min(berryBushComponent.numBerries, gatherMultiplier);

   for (let i = 0; i < numDroppedBerries; i++) {
      dropBerryOverEntity(berryBush);
   }
   berryBushComponent.numBerries--;
}

export function onBerryBushHurt(berryBush: Entity, attackingEntity: Entity | null): void {
   dropBerry(berryBush, attackingEntity);
}

export function serialiseBerryBushComponent(berryBush: Entity): BerryBushComponentData {
   const berryComponent = BerryBushComponentArray.getComponent(berryBush.id);
   return {
      numBerries: berryComponent.numBerries
   };
}