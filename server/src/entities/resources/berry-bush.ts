import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { createItemEntity } from "../item-entity";
import Board from "../../Board";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { BerryBushComponent, BerryBushComponentArray } from "../../components/BerryBushComponent";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

export const BERRY_BUSH_RADIUS = 40;

/** Number of seconds it takes for a berry bush to regrow one of its berries */
const BERRY_GROW_TIME = 30;

export function createBerryBush(position: Point, rotation: number): Entity {
   const berryBush = new Entity(position, rotation, EntityType.berryBush, COLLISION_BITS.plants, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(1, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, berryBush.getNextHitboxLocalID(), 0, BERRY_BUSH_RADIUS);
   berryBush.addHitbox(hitbox);

   HealthComponentArray.addComponent(berryBush.id, new HealthComponent(10));
   StatusEffectComponentArray.addComponent(berryBush.id, new StatusEffectComponent(0));
   BerryBushComponentArray.addComponent(berryBush.id, new BerryBushComponent());

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

   const itemEntityCreationInfo = createItemEntity(position, 2 * Math.PI * Math.random(), ItemType.berry, 1, 0);
   
   const velocityDirectionOffset = (Math.random() - 0.5) * Math.PI * 0.15
   const physicsComponent = itemEntityCreationInfo.components[ServerComponentType.physics];
   physicsComponent.velocity.x = 40 * Math.sin(spawnDirection + velocityDirectionOffset);
   physicsComponent.velocity.y = 40 * Math.cos(spawnDirection + velocityDirectionOffset);
}

export function dropBerry(berryBush: Entity, multiplier: number): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(berryBush.id);
   if (berryBushComponent.numBerries === 0) {
      return;
   }

   for (let i = 0; i < multiplier; i++) {
      dropBerryOverEntity(berryBush);
   }

   berryBushComponent.numBerries--;
}

export function onBerryBushHurt(berryBush: Entity): void {
   dropBerry(berryBush, 1);
}