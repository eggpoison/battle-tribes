import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import { ItemComponentArray } from "../components/ItemComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../components";
import { ItemType } from "battletribes-shared/items/items";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.item;

export function createItemEntityConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.itemEntity,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK & ~COLLISION_BITS.planterBox,
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), Settings.ITEM_SIZE, Settings.ITEM_SIZE, 0), 0.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
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
      [ServerComponentType.item]: {
         itemType: ItemType.healing_totem,
         amount: 1,
         throwingEntity: null
      }
   };
}

export function addItemEntityPlayerPickupCooldown(itemEntity: EntityID, entityID: number, cooldownDuration: number): void {
   const itemComponent = ItemComponentArray.getComponent(itemEntity);
   itemComponent.entityPickupCooldowns[entityID] = cooldownDuration;
}

export function itemEntityCanBePickedUp(itemEntity: EntityID, entityID: EntityID): boolean {
   const itemComponent = ItemComponentArray.getComponent(itemEntity);
   return typeof itemComponent.entityPickupCooldowns[entityID] === "undefined";
}