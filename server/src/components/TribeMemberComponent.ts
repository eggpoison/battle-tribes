import { ServerComponentType  } from "battletribes-shared/components";
import { EntityID, EntityType, LimbAction } from "battletribes-shared/entities";
import { TitleGenerationInfo, TribesmanTitle, TRIBESMAN_TITLE_RECORD } from "battletribes-shared/titles";
import { TRIBE_INFO_RECORD, TribeType } from "battletribes-shared/tribes";
import { lerp, randInt } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import { generateTitle, TITLE_REWARD_CHANCES } from "../tribesman-title-generation";
import { Settings } from "battletribes-shared/settings";
import { TribeComponentArray } from "./TribeComponent";
import { PlayerComponentArray } from "./PlayerComponent";
import { ArmourItemInfo, BackpackItemInfo, ConsumableItemInfo, Inventory, InventoryName, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType } from "battletribes-shared/items/items";
import { EntityConfig } from "../components";
import { tribeMemberCanPickUpItem, useItem, VACUUM_RANGE } from "../entities/tribes/tribe-member";
import { Packet } from "battletribes-shared/packets";
import { COLLISION_BITS } from "battletribes-shared/collision";
import { itemEntityCanBePickedUp } from "../entities/item-entity";
import { HealthComponentArray, addDefence, removeDefence } from "./HealthComponent";
import { InventoryComponentArray, addInventoryToInventoryComponent, getInventory, pickupItemEntity, resizeInventory } from "./InventoryComponent";
import { InventoryUseComponentArray, LimbInfo } from "./InventoryUseComponent";
import { ItemComponentArray } from "./ItemComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { adjustTribesmanRelationsAfterGift, TribesmanAIComponentArray } from "./TribesmanAIComponent";
import { getEntityLayer, getEntityType, getGameTicks } from "../world";
import { registerPlayerDroppedItemPickup } from "../server/player-clients";
import { createItem } from "../items";

const enum Vars {
   VACUUM_STRENGTH = 25
}

type TribesmanEntityType = EntityType.player | EntityType.tribeWorker | EntityType.tribeWarrior;

export class TribeMemberComponent {
   public warPaintType: number | null = null;

   public readonly fishFollowerIDs = new Array<number>();

   // @Speed: just have array of titles, and separate array of generation info
   public readonly titles = new Array<TitleGenerationInfo>();

   // Used to give movement penalty while wearing the leaf suit.
   // @Cleanup: would be great to not store a variable to do this.
   public lastPlantCollisionTicks = getGameTicks();
}

export const TribeMemberComponentArray = new ComponentArray<TribeMemberComponent>(ServerComponentType.tribeMember, true, {
   onJoin: onJoin,
   onRemove: onRemove,
   onInitialise: onInitialise,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onEntityCollision: onEntityCollision,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const getHotbarSize = (entityType: TribesmanEntityType): number => {
   switch (entityType) {
      case EntityType.player: return Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      case EntityType.tribeWorker: return 5;
      case EntityType.tribeWarrior: return 5;
   }
}

function onInitialise(config: EntityConfig<ServerComponentType.health | ServerComponentType.tribe | ServerComponentType.tribeMember | ServerComponentType.inventory | ServerComponentType.inventoryUse>, _: unknown): void {
   // War paint type
   const tribeMemberComponent = config.components[ServerComponentType.tribeMember];
   const tribeComponent = config.components[ServerComponentType.tribe];
   if (tribeComponent.tribe.tribeType === TribeType.goblins) {
      if (config.entityType === EntityType.tribeWarrior) {
         tribeMemberComponent.warPaintType = randInt(1, 1);
      } else {
         tribeMemberComponent.warPaintType = randInt(1, 5);
      }
   } else {
      tribeMemberComponent.warPaintType = null;
   }
   
   // 
   // Create inventories
   // 

   const inventoryComponent = config.components[ServerComponentType.inventory];

   // Hotbar
   const hotbarInventory = new Inventory(getHotbarSize(config.entityType as TribesmanEntityType), 1, InventoryName.hotbar);
   hotbarInventory.addItem(createItem(ItemType.woodenBracings, 99), 2);
   addInventoryToInventoryComponent(inventoryComponent, hotbarInventory, { acceptsPickedUpItems: true, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
   // Offhand
   const offhandInventory = new Inventory(1, 1, InventoryName.offhand);
   addInventoryToInventoryComponent(inventoryComponent, offhandInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
   // Crafting output slot
   const craftingOutputInventory = new Inventory(1, 1, InventoryName.craftingOutputSlot);
   addInventoryToInventoryComponent(inventoryComponent, craftingOutputInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
   // Held item slot
   const heldItemInventory = new Inventory(1, 1, InventoryName.heldItemSlot);
   addInventoryToInventoryComponent(inventoryComponent, heldItemInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
   // Armour slot
   const armourSlotInventory = new Inventory(1, 1, InventoryName.armourSlot);
   addInventoryToInventoryComponent(inventoryComponent, armourSlotInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: true });
   
   // Backpack slot
   const backpackSlotInventory = new Inventory(1, 1, InventoryName.backpackSlot);
   addInventoryToInventoryComponent(inventoryComponent, backpackSlotInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
   // Glove slot
   const gloveSlotInventory = new Inventory(1, 1, InventoryName.gloveSlot);
   addInventoryToInventoryComponent(inventoryComponent, gloveSlotInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: true });
   
   // Backpack
   const backpackInventory = new Inventory(1, 1, InventoryName.backpack);
   addInventoryToInventoryComponent(inventoryComponent, backpackInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });

   const inventoryUseComponent = config.components[ServerComponentType.inventoryUse];
   inventoryUseComponent.associatedInventoryNames.push(InventoryName.hotbar);
   inventoryUseComponent.associatedInventoryNames.push(InventoryName.offhand);
}

function onJoin(entity: EntityID): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   tribeComponent.tribe.registerNewTribeMember(entity);
}

function onRemove(entity: EntityID): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   tribeComponent.tribe.registerTribeMemberDeath(entity);
}

function getDataLength(entity: EntityID): number {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);

   let lengthBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * tribeMemberComponent.titles.length;

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);

   packet.addNumber(tribeMemberComponent.warPaintType !== null ? tribeMemberComponent.warPaintType : -1);

   packet.addNumber(tribeMemberComponent.titles.length);
   for (let i = 0; i < tribeMemberComponent.titles.length; i++) {
      const title = tribeMemberComponent.titles[i];
      packet.addNumber(title.title);
      packet.addNumber(title.displayOption);
   }
}

export function awardTitle(tribesman: EntityID, title: TribesmanTitle): void {
   // @Temporary
   if (1+1===2)return;
   
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesman);
   
   const titleTier = TRIBESMAN_TITLE_RECORD[title].tier;
   
   // Make sure the tribesman doesn't already have a title of that tier
   for (let i = 0; i < tribeMemberComponent.titles.length; i++) {
      const titleGenerationInfo = tribeMemberComponent.titles[i];

      const currentTitleInfo = TRIBESMAN_TITLE_RECORD[titleGenerationInfo.title];
      if (currentTitleInfo.tier === titleTier) {
         return;
      }
   }
   
   // If they are a player, buffer the title for the player to accept. AI tribesmen accept all titles immediately
   if (getEntityType(tribesman) === EntityType.player) {
      const playerComponent = PlayerComponentArray.getComponent(tribesman);
      if (playerComponent.titleOffer === null) {
         playerComponent.titleOffer = title;
      }
   } else {
      const titleGenerationInfo = generateTitle(title);
      tribeMemberComponent.titles.push(titleGenerationInfo);
   }
}

export function acceptTitleOffer(player: EntityID, title: TribesmanTitle): void {
   const playerComponent = PlayerComponentArray.getComponent(player);
   if (playerComponent.titleOffer === null || playerComponent.titleOffer !== title) {
      return;
   }

   // Give the title
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(player);
   const titleGenerationInfo = generateTitle(title);
   tribeMemberComponent.titles.push(titleGenerationInfo);
   
   playerComponent.titleOffer = null;
}

export function rejectTitleOffer(player: EntityID, title: TribesmanTitle): void {
   const playerComponent = PlayerComponentArray.getComponent(player);
   if (playerComponent.titleOffer === null || playerComponent.titleOffer === title) {
      playerComponent.titleOffer = null;
   }
}

// @Cleanup: two very similar functions

export function tribeMemberHasTitle(tribeMemberComponent: TribeMemberComponent, title: TribesmanTitle): boolean {
   for (let i = 0; i < tribeMemberComponent.titles.length; i++) {
      const titleGenerationInfo = tribeMemberComponent.titles[i];

      if (titleGenerationInfo.title === title) {
         return true;
      }
   }

   return false;
}

export function hasTitle(entityID: number, title: TribesmanTitle): boolean {
   if (!TribeMemberComponentArray.hasComponent(entityID)) {
      return false;
   }

   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entityID);

   for (let i = 0; i < tribeMemberComponent.titles.length; i++) {
      const currentTitle = tribeMemberComponent.titles[i].title;
      if (currentTitle === title) {
         return true;
      }
   }

   return false;
}

export function forceAddTitle(entityID: EntityID, title: TribesmanTitle): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entityID);
   
   // Make sure they don't already have the title
   for (let i = 0; i < tribeMemberComponent.titles.length; i++) {
      const titleGenerationInfo = tribeMemberComponent.titles[i];

      if (titleGenerationInfo.title === title) {
         return;
      }
   }

   const titleGenerationInfo = generateTitle(title);
   tribeMemberComponent.titles.push(titleGenerationInfo);
}

export function removeTitle(entityID: EntityID, title: TribesmanTitle): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entityID);

   for (let i = 0; i < tribeMemberComponent.titles.length; i++) {
      const titleGenerationInfo = tribeMemberComponent.titles[i];

      if (titleGenerationInfo.title === title) {
         tribeMemberComponent.titles.splice(i, 1);
         break;
      }
   }
}

// @Cleanup: Move to tick function
const tickInventoryUseInfo = (tribeMember: EntityID, inventoryUseInfo: LimbInfo): void => {
   switch (inventoryUseInfo.action) {
      case LimbAction.eat:
      case LimbAction.useMedicine: {
         inventoryUseInfo.foodEatingTimer -= Settings.I_TPS;
   
         if (inventoryUseInfo.foodEatingTimer <= 0) {
            const inventory = inventoryUseInfo.associatedInventory;
            
            const selectedItem = inventory.itemSlots[inventoryUseInfo.selectedItemSlot];
            if (typeof selectedItem !== "undefined") {
               const itemCategory = ITEM_TYPE_RECORD[selectedItem.type];
               if (itemCategory === "healing") {
                  useItem(tribeMember, selectedItem, inventory.name, inventoryUseInfo.selectedItemSlot);
   
                  const itemInfo = ITEM_INFO_RECORD[selectedItem.type] as ConsumableItemInfo;
                  inventoryUseInfo.foodEatingTimer = itemInfo.consumeTime;

                  if (TribesmanAIComponentArray.hasComponent(tribeMember) && Math.random() < TITLE_REWARD_CHANCES.BERRYMUNCHER_REWARD_CHANCE) {
                     awardTitle(tribeMember, TribesmanTitle.berrymuncher);
                  }
               }
            }
         }
         break;
      }
      case LimbAction.loadCrossbow: {
         const loadProgress = inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot];
         if (typeof loadProgress === "undefined") {
            inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot] = Settings.I_TPS;
         } else {
            inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot]! += Settings.I_TPS;
         }
         
         if (inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot]! >= 1) {
            inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot] = 1;
            inventoryUseInfo.action = LimbAction.none;
         }
         
         break;
      }
   }
}

function onTick(_tribeMemberComponent: TribeMemberComponent, tribeMember: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(tribeMember);
   const layer = getEntityLayer(tribeMember);
   
   // Vacuum nearby items to the tribesman
   // @Incomplete: Don't vacuum items which the player doesn't have the inventory space for
   // @Bug: permits vacuuming the same item entity twice
   const minChunkX = Math.max(Math.floor((transformComponent.position.x - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((transformComponent.position.x + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((transformComponent.position.y - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((transformComponent.position.y + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const itemEntity of chunk.entities) {
            if (getEntityType(itemEntity) !== EntityType.itemEntity || !itemEntityCanBePickedUp(itemEntity, tribeMember)) {
               continue;
            }

            const itemComponent = ItemComponentArray.getComponent(itemEntity);
            if (!tribeMemberCanPickUpItem(tribeMember, itemComponent.itemType)) {
               continue;
            }

            const itemEntityTransformComponent = TransformComponentArray.getComponent(itemEntity);
            
            const distance = transformComponent.position.calculateDistanceBetween(itemEntityTransformComponent.position);
            if (distance <= VACUUM_RANGE) {
               // @Temporary
               let forceMult = 1 - distance / VACUUM_RANGE;
               forceMult = lerp(0.5, 1, forceMult);

               const vacuumDirection = itemEntityTransformComponent.position.calculateAngleBetween(transformComponent.position);
               const physicsComponent = PhysicsComponentArray.getComponent(itemEntity);
               physicsComponent.externalVelocity.x += Vars.VACUUM_STRENGTH * forceMult * Math.sin(vacuumDirection);
               physicsComponent.externalVelocity.y += Vars.VACUUM_STRENGTH * forceMult * Math.cos(vacuumDirection);
            }
         }
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(tribeMember);
   if (physicsComponent.selfVelocity.x !== 0 || physicsComponent.selfVelocity.y !== 0) {
      const selfVelocityMagnitude = Math.sqrt(physicsComponent.selfVelocity.x * physicsComponent.selfVelocity.x + physicsComponent.selfVelocity.y * physicsComponent.selfVelocity.y);
      
      const chance = TITLE_REWARD_CHANCES.SPRINTER_REWARD_CHANCE_PER_SPEED * selfVelocityMagnitude;
      if (Math.random() < chance / Settings.TPS) {
         awardTitle(tribeMember, TribesmanTitle.sprinter);
      }
   }

   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);

   const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   tickInventoryUseInfo(tribeMember, useInfo);

   const tribeComponent = TribeComponentArray.getComponent(tribeMember);
   if (tribeComponent.tribe.tribeType === TribeType.barbarians && getEntityType(tribeMember) !== EntityType.tribeWorker) {
      const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.offhand);
      tickInventoryUseInfo(tribeMember, useInfo);
   }

   // @Speed: Shouldn't be done every tick, only do when the backpack changes
   // Update backpack
   const backpackSlotInventory = getInventory(inventoryComponent, InventoryName.backpackSlot);
   const backpack = backpackSlotInventory.itemSlots[1];
   if (typeof backpack !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[backpack.type] as BackpackItemInfo;
      resizeInventory(inventoryComponent, InventoryName.backpack, itemInfo.inventoryWidth, itemInfo.inventoryHeight);
   } else {
      resizeInventory(inventoryComponent, InventoryName.backpack, 0, 0);
   }
      
   const healthComponent = HealthComponentArray.getComponent(tribeMember);

   // @Speed: Shouldn't be done every tick, only do when the armour changes
   // Armour defence
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
   const armour = armourSlotInventory.itemSlots[1];
   if (typeof armour !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[armour.type] as ArmourItemInfo;
      addDefence(healthComponent, itemInfo.defence, "armour");

      if (armour.type === ItemType.leaf_suit) {
         transformComponent.collisionMask &= ~COLLISION_BITS.plants;
      } else {
         transformComponent.collisionMask |= COLLISION_BITS.plants;
      }
   } else {
      removeDefence(healthComponent, "armour");
   }
}

function onEntityCollision(tribeMember: EntityID, collidingEntity: EntityID): void {
   if (getEntityType(collidingEntity) === EntityType.itemEntity) {
      const itemComponent = ItemComponentArray.getComponent(collidingEntity);
      
      // Keep track of it beforehand as the amount variable gets changed when being picked up
      const itemAmount = itemComponent.amount;

      const wasPickedUp = pickupItemEntity(tribeMember, collidingEntity);

      if (wasPickedUp) {
         if (getEntityType(tribeMember) === EntityType.player) {
            registerPlayerDroppedItemPickup(tribeMember);
         } else if (itemComponent.throwingEntity !== null && itemComponent.throwingEntity !== tribeMember) {
            adjustTribesmanRelationsAfterGift(tribeMember, itemComponent.throwingEntity, itemComponent.itemType, itemAmount);
         }
      }
   }
}