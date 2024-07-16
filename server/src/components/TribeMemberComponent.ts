import { ServerComponentType, TribeMemberComponentData } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { TitleGenerationInfo, TribesmanTitle, TRIBESMAN_TITLE_RECORD } from "webgl-test-shared/dist/titles";
import { TRIBE_INFO_RECORD, TribeType } from "webgl-test-shared/dist/tribes";
import { randInt } from "webgl-test-shared/dist/utils";
import { ComponentArray } from "./ComponentArray";
import { generateTitle } from "../tribesman-title-generation";
import Board from "../Board";
import { Settings } from "webgl-test-shared/dist/settings";
import { TribeComponentArray } from "./TribeComponent";
import { PlayerComponentArray } from "./PlayerComponent";
import { InventoryName } from "webgl-test-shared/dist/items/items";
import { ComponentConfig } from "../components";
import { HealthComponentArray } from "./HealthComponent";
import { tickTribeMember } from "../entities/tribes/tribe-member";

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
   onTick: tickTribeMember,
   serialise: serialise
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
      items: []
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

function onRemove(entityID: number): void {
   const tribeComponent = TribeComponentArray.getComponent(entityID);
   tribeComponent.tribe.registerTribeMemberDeath(entityID);
}

function serialise(entityID: number): TribeMemberComponentData {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.tribeMember,
      warPaintType: tribeMemberComponent.warPaintType,
      titles: tribeMemberComponent.titles
   };
}

export function awardTitle(tribesman: EntityID, title: TribesmanTitle): void {
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