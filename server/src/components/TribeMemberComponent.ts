import { ServerComponentType  } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { getStringLengthBytes, Packet } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityLayer, getEntityType } from "../world";
import { tribeMemberCanPickUpItem, VACUUM_RANGE } from "../entities/tribes/tribe-member";
import { Settings } from "../../../shared/src/settings";
import { lerp, polarVec2 } from "../../../shared/src/utils";
import { itemEntityCanBePickedUp, ItemComponentArray } from "./ItemComponent";
import { TribesmanComponentArray } from "./TribesmanComponent";
import { registerPlayerDroppedItemPickup } from "../server/player-clients";
import { getInventory, hasInventory, InventoryComponentArray, pickupItemEntity } from "./InventoryComponent";
import { adjustTribesmanRelationsAfterGift } from "./TribesmanAIComponent";
import { ArmourItemInfo, InventoryName, ITEM_INFO_RECORD, ItemType } from "../../../shared/src/items/items";
import { addDefence, HealthComponentArray, removeDefence } from "./HealthComponent";
import { CollisionBit } from "../../../shared/src/collision";
import { addHitboxVelocity } from "../hitboxes";

const enum Vars {
   VACUUM_STRENGTH = 25
}

/** For members of a tribe: e.g. tribesmen and automatons. */
export class TribeMemberComponent {
   public name: string;

   constructor(name: string) {
      this.name = name;
   }
}

export const TribeMemberComponentArray = new ComponentArray<TribeMemberComponent>(ServerComponentType.tribeMember, true, getDataLength, addDataToPacket);
TribeMemberComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};
TribeMemberComponentArray.onEntityCollision = onEntityCollision;

function onTick(tribeMember: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(tribeMember);
   const tribeMemberHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(tribeMember);
   
   // Vacuum nearby items to the tribesman
   // @Incomplete: Don't vacuum items which the player doesn't have the inventory space for
   // @Bug: permits vacuuming the same item entity twice
   const minChunkX = Math.max(Math.floor((tribeMemberHitbox.box.position.x - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((tribeMemberHitbox.box.position.x + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   const minChunkY = Math.max(Math.floor((tribeMemberHitbox.box.position.y - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((tribeMemberHitbox.box.position.y + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const itemEntity of chunk.entities) {
            if (getEntityType(itemEntity) !== EntityType.itemEntity || !itemEntityCanBePickedUp(itemEntity, tribeMember)) {
               continue;
            }

            const itemComponent = ItemComponentArray.getComponent(itemEntity);
            if (!tribeMemberCanPickUpItem(tribeMember, itemComponent.item.type)) {
               continue;
            }

            const itemEntityTransformComponent = TransformComponentArray.getComponent(itemEntity);
            const itemEntityHitbox = itemEntityTransformComponent.hitboxes[0];
            
            const distance = tribeMemberHitbox.box.position.distanceTo(itemEntityHitbox.box.position);
            if (distance <= VACUUM_RANGE) {
               // @Temporary
               let forceMult = 1 - distance / VACUUM_RANGE;
               forceMult = lerp(0.5, 1, forceMult);

               const vacuumDirection = itemEntityHitbox.box.position.angleTo(tribeMemberHitbox.box.position);
               addHitboxVelocity(itemEntityHitbox, polarVec2(Vars.VACUUM_STRENGTH * forceMult, vacuumDirection));
            }
         }
      }
   }

   // @Hack: This really shouldn't be done in this component with this check!
   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
   if (hasInventory(inventoryComponent, InventoryName.armourSlot)) {
      const healthComponent = HealthComponentArray.getComponent(tribeMember);
   
      // @Speed: Shouldn't be done every tick, only do when the armour changes
      // Armour defence
      const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
      const armour = armourSlotInventory.itemSlots[1];
      if (typeof armour !== "undefined") {
         const itemInfo = ITEM_INFO_RECORD[armour.type] as ArmourItemInfo;
         addDefence(healthComponent, itemInfo.defence, "armour");
   
         if (armour.type === ItemType.leaf_suit) {
            // @HACK
            for (const hitbox of transformComponent.hitboxes) {
               hitbox.collisionMask &= ~CollisionBit.plant;
            }
         } else {
            // @HACK
            for (const hitbox of transformComponent.hitboxes) {
               hitbox.collisionMask |= CollisionBit.plant;
            }
         }
      } else {
         removeDefence(healthComponent, "armour");
      }
   }
}

function onEntityCollision(tribeMember: Entity, collidingEntity: Entity): void {
   if (getEntityType(collidingEntity) === EntityType.itemEntity) {
      const itemComponent = ItemComponentArray.getComponent(collidingEntity);
      
      // Keep track of it beforehand as the amount variable gets changed when being picked up
      const itemAmount = itemComponent.item.count;

      const wasPickedUp = pickupItemEntity(tribeMember, collidingEntity);

      if (wasPickedUp) {
         if (getEntityType(tribeMember) === EntityType.player) {
            registerPlayerDroppedItemPickup(tribeMember);
         } else if (TribesmanComponentArray.hasComponent(tribeMember) && itemComponent.throwingEntity !== null && itemComponent.throwingEntity !== tribeMember) {
            adjustTribesmanRelationsAfterGift(tribeMember, itemComponent.throwingEntity, itemComponent.item.type, itemAmount);
         }
      }
   }
}

function getDataLength(entity: Entity): number {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);
   return getStringLengthBytes(tribeMemberComponent.name);
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);
   packet.writeString(tribeMemberComponent.name);
}