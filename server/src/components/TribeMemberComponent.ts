import { ServerComponentType  } from "webgl-test-shared/dist/components";
import { EntityID, EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { TitleGenerationInfo, TribesmanTitle, TRIBESMAN_TITLE_RECORD } from "webgl-test-shared/dist/titles";
import { TRIBE_INFO_RECORD, TribeType } from "webgl-test-shared/dist/tribes";
import { lerp, randInt } from "webgl-test-shared/dist/utils";
import { ComponentArray } from "./ComponentArray";
import { generateTitle, TITLE_REWARD_CHANCES } from "../tribesman-title-generation";
import Board from "../Board";
import { Settings } from "webgl-test-shared/dist/settings";
import { TribeComponentArray } from "./TribeComponent";
import { PlayerComponentArray } from "./PlayerComponent";
import { ArmourItemInfo, BackpackItemInfo, ConsumableItemInfo, InventoryName, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType } from "webgl-test-shared/dist/items/items";
import { ComponentConfig } from "../components";
import { tribeMemberCanPickUpItem, useItem, VACUUM_RANGE } from "../entities/tribes/tribe-member";
import { Packet } from "webgl-test-shared/dist/packets";
import { COLLISION_BITS } from "webgl-test-shared/dist/collision";
import { itemEntityCanBePickedUp } from "../entities/item-entity";
import { HealthComponentArray, addDefence, removeDefence } from "./HealthComponent";
import { InventoryComponentArray, getInventory, resizeInventory } from "./InventoryComponent";
import { InventoryUseComponentArray, LimbInfo } from "./InventoryUseComponent";
import { ItemComponentArray } from "./ItemComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { TribesmanAIComponentArray } from "./TribesmanAIComponent";
import { createItem } from "../items";

const enum Vars {
   VACUUM_STRENGTH = 25
}

export interface TribeMemberComponentParams {
   // @Cleanup: this all sucks
   readonly tribeType: TribeType;
   readonly entityType: EntityType;
}

type TribesmanEntityType = EntityType.player | EntityType.tribeWorker | EntityType.tribeWarrior;

export class TribeMemberComponent {
   public readonly warPaintType: number | null;

   public readonly fishFollowerIDs = new Array<number>();

   // @Speed: just have array of titles, and separate array of generation info
   public readonly titles = new Array<TitleGenerationInfo>();

   // Used to give movement penalty while wearing the leaf suit.
   // @Cleanup: would be great to not store a variable to do this.
   public lastPlantCollisionTicks = Board.ticks;

   constructor(params: TribeMemberComponentParams) {
      if (params.tribeType === TribeType.goblins) {
         if (params.entityType === EntityType.tribeWarrior) {
            this.warPaintType = randInt(1, 1);
         } else {
            this.warPaintType = randInt(1, 5);
         }
      } else {
         this.warPaintType = null;
      }
   }
}

export const TribeMemberComponentArray = new ComponentArray<TribeMemberComponent>(ServerComponentType.tribeMember, true, {
   onJoin: onJoin,
   onRemove: onRemove,
   onInitialise: onInitialise,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
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

function onInitialise(config: ComponentConfig<ServerComponentType.health | ServerComponentType.tribe | ServerComponentType.inventory | ServerComponentType.inventoryUse>, _: unknown, entityType: EntityType): void {
   // 
   // Create inventories
   // 

   // Hotbar
   config[ServerComponentType.inventory].inventories.push({
      inventoryName: InventoryName.hotbar,
      width: getHotbarSize(entityType as TribesmanEntityType),
      height: 1,
      options: { acceptsPickedUpItems: true, isDroppedOnDeath: true },
      // @Temporary
      items: [
         {
            item: createItem(ItemType.wooden_sword, 1),
            itemSlot: 2
         },
         {
            item: createItem(ItemType.wooden_pickaxe, 1),
            itemSlot: 3
         },
         {
            item: createItem(ItemType.wooden_axe, 1),
            itemSlot: 4
         },
         {
            item: createItem(ItemType.spear, 5),
            itemSlot: 5
         },
         // @Temporary
         // {
         //    item: createItem(ItemType.wooden_bow, 1),
         //    itemSlot: 6
         // },
         {
            item: createItem(ItemType.berry, 5),
            itemSlot: 7
         },
      ]
   });
   
   // Offhand
   config[ServerComponentType.inventory].inventories.push({
      inventoryName: InventoryName.offhand,
      width: 1,
      height: 1,
      options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
      items: []
   });
   
   // Crafting output slot
   config[ServerComponentType.inventory].inventories.push({
      inventoryName: InventoryName.craftingOutputSlot,
      width: 1,
      height: 1,
      options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
      items: []
   });
   
   // Held item slot
   config[ServerComponentType.inventory].inventories.push({
      inventoryName: InventoryName.heldItemSlot,
      width: 1,
      height: 1,
      options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
      items: []
   });
   
   // Armour slot
   config[ServerComponentType.inventory].inventories.push({
      inventoryName: InventoryName.armourSlot,
      width: 1,
      height: 1,
      options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
      items: []
   });
   
   // Backpack slot
   config[ServerComponentType.inventory].inventories.push({
      inventoryName: InventoryName.backpackSlot,
      width: 1,
      height: 1,
      options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
      items: []
   });
   
   // Glove slot
   config[ServerComponentType.inventory].inventories.push({
      inventoryName: InventoryName.gloveSlot,
      width: 1,
      height: 1,
      options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
      items: []
   });
   
   // Backpack
   config[ServerComponentType.inventory].inventories.push({
      inventoryName: InventoryName.backpack,
      width: 0,
      height: 0,
      options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
      items: []
   });

   config[ServerComponentType.inventoryUse].usedInventoryNames.push(InventoryName.hotbar);
   config[ServerComponentType.inventoryUse].usedInventoryNames.push(InventoryName.offhand);

   // @Hack
   const tribe = config[ServerComponentType.tribe].tribe!;
   const tribeInfo = TRIBE_INFO_RECORD[tribe.tribeType];
   switch (entityType) {
      case EntityType.player:
      case EntityType.tribeWarrior: {
         config[ServerComponentType.health].maxHealth = tribeInfo.maxHealthPlayer;
         break;
      }
      case EntityType.tribeWorker: {
         config[ServerComponentType.health].maxHealth = tribeInfo.maxHealthWorker;
         break;
      }
   }
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
   if (Board.getEntityType(tribesman) === EntityType.player) {
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
   
   // Vacuum nearby items to the tribesman
   // @Incomplete: Don't vacuum items which the player doesn't have the inventory space for
   // @Bug: permits vacuuming the same item entity twice
   const minChunkX = Math.max(Math.floor((transformComponent.position.x - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((transformComponent.position.x + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((transformComponent.position.y - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((transformComponent.position.y + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const itemEntity of chunk.entities) {
            if (Board.getEntityType(itemEntity) !== EntityType.itemEntity || !itemEntityCanBePickedUp(itemEntity, tribeMember)) {
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
   if (tribeComponent.tribe.tribeType === TribeType.barbarians && Board.getEntityType(tribeMember) !== EntityType.tribeWorker) {
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