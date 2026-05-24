import { ServerComponentType, Entity, EntityType, getStringLengthBytes, Packet, Settings, lerp, polarVec2, ArmourItemInfo, InventoryName, ITEM_INFO_RECORD, ItemType, CollisionBit, distance, angle } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { getEntityLayer, getEntityType } from "../world.js";
import { tribeMemberCanPickUpItem, VACUUM_RANGE } from "../entities/tribes/tribe-member.js";
import { itemEntityCanBePickedUp, ItemComponentArray } from "./ItemComponent.js";
import { TribesmanComponentArray } from "./TribesmanComponent.js";
import { registerPlayerDroppedItemPickup } from "../server/player-clients.js";
import { getInventory, hasInventory, InventoryComponentArray, pickupItemEntity } from "./InventoryComponent.js";
import { adjustTribesmanRelationsAfterGift } from "./TribesmanAIComponent.js";
import { addDefence, HealthComponentArray, removeDefence } from "./HealthComponent.js";
import { addHitboxVelocity } from "../hitboxes.js";

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
   const minChunkX = Math.max(Math.floor((tribeMemberHitbox.box.posX - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((tribeMemberHitbox.box.posX + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   const minChunkY = Math.max(Math.floor((tribeMemberHitbox.box.posY - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((tribeMemberHitbox.box.posY + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
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
            
            const dist = distance(tribeMemberHitbox.box.posX, tribeMemberHitbox.box.posY, itemEntityHitbox.box.posX, itemEntityHitbox.box.posY);
            if (dist <= VACUUM_RANGE) {
               // @Temporary
               let forceMult = 1 - dist / VACUUM_RANGE;
               forceMult = lerp(0.5, 1, forceMult);

               const vacuumDirection = angle(tribeMemberHitbox.box.posX - itemEntityHitbox.box.posX, tribeMemberHitbox.box.posY - itemEntityHitbox.box.posY);
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