import { ServerComponentType, TribeMemberComponentData } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { TitleGenerationInfo, TribesmanTitle, TRIBESMAN_TITLE_RECORD } from "webgl-test-shared/dist/titles";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { randInt } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { ComponentArray } from "./ComponentArray";
import { generateTitle } from "../tribesman-title-generation";
import Board from "../Board";
import { InventoryComponentArray, createNewInventory } from "./InventoryComponent";
import { Settings } from "webgl-test-shared/dist/settings";
import { TribeComponentArray } from "./TribeComponent";
import { PlayerComponentArray } from "./PlayerComponent";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { InventoryName } from "webgl-test-shared/dist/items/items";
import { ComponentRecord } from "../components";

type TribesmanEntityType = EntityType.player | EntityType.tribeWorker | EntityType.tribeWarrior;

export class TribeMemberComponent {
   public readonly warPaintType: number | null;

   public readonly fishFollowerIDs = new Array<number>();

   // @Speed: just have array of titles, and separate array of generation info
   public readonly titles = new Array<TitleGenerationInfo>();

   // Used to give movement penalty while wearing the leaf suit.
   // @Cleanup: would be great to not store a variable to do this.
   public lastPlantCollisionTicks = Board.ticks;

   constructor(tribeType: TribeType, entityType: EntityType) {
      if (tribeType === TribeType.goblins) {
         if (entityType === EntityType.tribeWarrior) {
            this.warPaintType = randInt(1, 1);
         } else {
            this.warPaintType = randInt(1, 5);
         }
      } else {
         this.warPaintType = null;
      }
   }
}

export const TribeMemberComponentArray = new ComponentArray<ServerComponentType.tribeMember, TribeMemberComponent>(true, {
   onJoin: onJoin,
   onRemove: onRemove,
   onInitialise: onInitialise,
   serialise: serialise
});

const getHotbarSize = (entityType: TribesmanEntityType): number => {
   switch (entityType) {
      case EntityType.player: return Settings.INITIAL_PLAYER_HOTBAR_SIZE;
      case EntityType.tribeWorker: return 5;
      case EntityType.tribeWarrior: return 5;
   }
}

function onJoin(entityID: number): void {
   const tribeComponent = TribeComponentArray.getComponent(entityID);
   tribeComponent.tribe.registerNewTribeMember(entityID);
}

function onRemove(entityID: number): void {
   const tribeComponent = TribeComponentArray.getComponent(entityID);
   tribeComponent.tribe.registerTribeMemberDeath(entityID);
}

function onInitialise(entity: Entity, componentRecord: ComponentRecord): void {
   // 
   // Create inventories
   // 

   const inventoryComponent = componentRecord[ServerComponentType.inventory]!;
   const inventoryUseComponent = componentRecord[ServerComponentType.inventoryUse]!;
   
   const hotbarSize = getHotbarSize(entity.type as TribesmanEntityType);
   const hotbarInventory = createNewInventory(inventoryComponent, InventoryName.hotbar, hotbarSize, 1, { acceptsPickedUpItems: true, isDroppedOnDeath: true });
   inventoryUseComponent.addInventoryUseInfo(hotbarInventory);

   const offhandInventory = createNewInventory(inventoryComponent, InventoryName.offhand, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   inventoryUseComponent.addInventoryUseInfo(offhandInventory);

   createNewInventory(inventoryComponent, InventoryName.craftingOutputSlot, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   createNewInventory(inventoryComponent, InventoryName.heldItemSlot, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   createNewInventory(inventoryComponent, InventoryName.armourSlot, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   createNewInventory(inventoryComponent, InventoryName.backpackSlot, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   createNewInventory(inventoryComponent, InventoryName.gloveSlot, 1, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   createNewInventory(inventoryComponent, InventoryName.backpack, 0, 0, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
}

function serialise(entityID: number): TribeMemberComponentData {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.tribeMember,
      warPaintType: tribeMemberComponent.warPaintType,
      titles: tribeMemberComponent.titles
   };
}

export function awardTitle(tribesman: Entity, title: TribesmanTitle): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesman.id);
   
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
   if (tribesman.type === EntityType.player) {
      const playerComponent = PlayerComponentArray.getComponent(tribesman.id);
      if (playerComponent.titleOffer === null) {
         playerComponent.titleOffer = title;
      }
   } else {
      const titleGenerationInfo = generateTitle(title);
      tribeMemberComponent.titles.push(titleGenerationInfo);
   }
}

export function acceptTitleOffer(player: Entity, title: TribesmanTitle): void {
   const playerComponent = PlayerComponentArray.getComponent(player.id);
   if (playerComponent.titleOffer === null || playerComponent.titleOffer !== title) {
      return;
   }

   // Give the title
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(player.id);
   const titleGenerationInfo = generateTitle(title);
   tribeMemberComponent.titles.push(titleGenerationInfo);
   
   playerComponent.titleOffer = null;
}

export function rejectTitleOffer(player: Entity, title: TribesmanTitle): void {
   const playerComponent = PlayerComponentArray.getComponent(player.id);
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