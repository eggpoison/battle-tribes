import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point } from "webgl-test-shared/dist/utils";
import { ItemComponentArray } from "../components/ItemComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../components";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { TransformComponentArray } from "../components/TransformComponent";
import Board from "../Board";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.item;

const TICKS_TO_DESPAWN = 300 * Settings.TPS;

export function createItemEntityConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.itemEntity,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK & ~COLLISION_BITS.planterBox,
         hitboxes: [new RectangularHitbox(0.2, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, Settings.ITEM_SIZE, Settings.ITEM_SIZE, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.item]: {
         itemType: ItemType.healing_totem,
         amount: 1,
         throwingEntity: null
      }
   };
}

export function tickItemEntity(itemEntity: EntityID): void {
   // Despawn old items
   const transformComponent = TransformComponentArray.getComponent(itemEntity);
   if (transformComponent.ageTicks >= TICKS_TO_DESPAWN) {
      Board.destroyEntity(itemEntity);
   }
}

export function addItemEntityPlayerPickupCooldown(itemEntity: EntityID, entityID: number, cooldownDuration: number): void {
   const itemComponent = ItemComponentArray.getComponent(itemEntity);
   itemComponent.entityPickupCooldowns[entityID] = cooldownDuration;
}

export function itemEntityCanBePickedUp(itemEntity: EntityID, entityID: EntityID): boolean {
   const itemComponent = ItemComponentArray.getComponent(itemEntity);
   return typeof itemComponent.entityPickupCooldowns[entityID] === "undefined";
}