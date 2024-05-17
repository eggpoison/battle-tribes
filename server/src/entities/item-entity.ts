import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { ItemComponentArray } from "../components/ComponentArray";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { ItemComponent } from "../components/ItemComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../components/PhysicsComponent";
import { addFleshSword, removeFleshSword } from "../flesh-sword-ai";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityCreationInfo } from "../entity-components";

type ComponentTypes = [ServerComponentType.physics, ServerComponentType.item];

const TICKS_TO_DESPAWN = 300 * Settings.TPS;

export function createItemEntity(position: Point, rotation: number, itemType: ItemType, amount: number, throwingEntityID: number): EntityCreationInfo<ComponentTypes> {
   const itemEntity = new Entity(position, rotation, EntityType.itemEntity, COLLISION_BITS.default, DEFAULT_COLLISION_MASK & ~COLLISION_BITS.planterBox);

   const hitbox = new RectangularHitbox(position, 0.2, 0, 0, HitboxCollisionType.soft, itemEntity.getNextHitboxLocalID(), itemEntity.rotation, Settings.ITEM_SIZE, Settings.ITEM_SIZE, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   itemEntity.addHitbox(hitbox);

   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, true, false);
   PhysicsComponentArray.addComponent(itemEntity.id, physicsComponent);

   const itemComponent = new ItemComponent(itemType, amount, throwingEntityID);
   ItemComponentArray.addComponent(itemEntity.id, itemComponent);

   if (throwingEntityID !== 0) {
      // Add a pickup cooldown so the item isn't picked up immediately
      itemComponent.entityPickupCooldowns[throwingEntityID] = 1
   }

   if (itemComponent.itemType === ItemType.flesh_sword) {
      addFleshSword(itemEntity);
   }

   return {
      entity: itemEntity,
      components: {
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.item]: itemComponent
      }
   };
}

export function tickItemEntity(itemEntity: Entity): void {
   // Despawn old items
   if (itemEntity.ageTicks >= TICKS_TO_DESPAWN) {
      itemEntity.destroy();
   }
}

export function addItemEntityPlayerPickupCooldown(itemEntity: Entity, entityID: number, cooldownDuration: number): void {
   const itemComponent = ItemComponentArray.getComponent(itemEntity.id);
   itemComponent.entityPickupCooldowns[entityID] = cooldownDuration;
}

export function itemEntityCanBePickedUp(itemEntity: Entity, entityID: number): boolean {
   const itemComponent = ItemComponentArray.getComponent(itemEntity.id);
   return typeof itemComponent.entityPickupCooldowns[entityID] === "undefined";
}

export function onItemEntityRemove(itemEntity: Entity): void {
   // Remove flesh sword item entities
   const itemComponent = ItemComponentArray.getComponent(itemEntity.id);
   if (itemComponent.itemType === ItemType.flesh_sword) {
      removeFleshSword(itemEntity);
   }
}