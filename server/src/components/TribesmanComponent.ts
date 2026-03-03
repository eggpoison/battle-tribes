import { ServerComponentType } from "../../../shared/src/components";
import { EntityType, Entity, LimbAction } from "../../../shared/src/entities";
import { BackpackItemInfo, ConsumableItemInfo, InventoryName, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType } from "../../../shared/src/items/items";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { TileType } from "../../../shared/src/tiles";
import { TitleGenerationInfo, TRIBESMAN_TITLE_RECORD, TribesmanTitle } from "../../../shared/src/titles";
import { TribeType } from "../../../shared/src/tribes";
import { Point, randInt } from "../../../shared/src/utils";
import { EntityConfig } from "../components";
import { onFishLeaderHurt } from "../entities/mobs/fish";
import { useItem } from "../entities/tribes/tribe-member";
import { getHitboxTile, getHitboxVelocity, Hitbox } from "../hitboxes";
import { addHumanoidInventories } from "../inventories";
import { generateTitle, TITLE_REWARD_CHANCES } from "../tribesman-title-generation";
import { getEntityLayer, getEntityType, getGameTicks } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray } from "./HealthComponent";
import { InventoryComponentArray, getInventory, resizeInventory } from "./InventoryComponent";
import { LimbInfo, InventoryUseComponentArray } from "./InventoryUseComponent";
import { PlayerComponentArray } from "./PlayerComponent";
import { TransformComponentArray } from "./TransformComponent";
import { TribeComponentArray } from "./TribeComponent";
import { TribesmanAIComponentArray, adjustTribesmanRelationsAfterKill, adjustTribeRelations } from "./TribesmanAIComponent";

export class TribesmanComponent {
   public warPaintType: number | null = null;

   public readonly fishFollowerIDs = new Array<number>();

   // @Speed: just have array of titles, and separate array of generation info
   public readonly titles = new Array<TitleGenerationInfo>();

   // Used to give movement penalty while wearing the leaf suit.
   // @Cleanup: would be great to not store a variable to do this.
   public lastPlantCollisionTicks = getGameTicks();

   /** Way the player is intending on moving. Useful for controlling mounts when riding them. */
   public moveIntention: number | null = null;
}

export const TribesmanComponentArray = new ComponentArray<TribesmanComponent>(ServerComponentType.tribesman, true, getDataLength, addDataToPacket);
TribesmanComponentArray.onInitialise = onInitialise;
TribesmanComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
TribesmanComponentArray.onDeath = onDeath;
TribesmanComponentArray.onKill = onKill;
TribesmanComponentArray.onTakeDamage = onTakeDamage;
TribesmanComponentArray.onDealDamage = onDealDamage;

function onInitialise(config: EntityConfig): void {
   // War paint type
   const tribesmanComponent = config.components[ServerComponentType.tribesman]!;
   const tribeComponent = config.components[ServerComponentType.tribe]!;
   if (tribeComponent.tribe.tribeType === TribeType.goblins) {
      if (config.entityType === EntityType.tribeWarrior) {
         tribesmanComponent.warPaintType = randInt(1, 1);
      } else {
         tribesmanComponent.warPaintType = randInt(1, 5);
      }
   } else {
      tribesmanComponent.warPaintType = null;
   }
   
   // 
   // Create inventories
   // 

   const inventoryComponent = config.components[ServerComponentType.inventory]!;
   const inventoryUseComponent = config.components[ServerComponentType.inventoryUse]!;
   addHumanoidInventories(inventoryComponent, inventoryUseComponent, config.entityType);
}

function getDataLength(entity: Entity): number {
   const tribesmanComponent = TribesmanComponentArray.getComponent(entity);

   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * tribesmanComponent.titles.length;

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tribesmanComponent = TribesmanComponentArray.getComponent(entity);

   packet.writeNumber(tribesmanComponent.warPaintType !== null ? tribesmanComponent.warPaintType : -1);

   packet.writeNumber(tribesmanComponent.titles.length);
   for (let i = 0; i < tribesmanComponent.titles.length; i++) {
      const title = tribesmanComponent.titles[i];
      packet.writeNumber(title.title);
      packet.writeNumber(title.displayOption);
   }
}

export function awardTitle(tribesman: Entity, title: TribesmanTitle): void {
   // @Temporary
   if (1+1===2)return;
   
   const tribesmanComponent = TribesmanComponentArray.getComponent(tribesman);
   
   const titleTier = TRIBESMAN_TITLE_RECORD[title].tier;
   
   // Make sure the tribesman doesn't already have a title of that tier
   for (let i = 0; i < tribesmanComponent.titles.length; i++) {
      const titleGenerationInfo = tribesmanComponent.titles[i];

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
      tribesmanComponent.titles.push(titleGenerationInfo);
   }
}

export function acceptTitleOffer(player: Entity, title: TribesmanTitle): void {
   const playerComponent = PlayerComponentArray.getComponent(player);
   if (playerComponent.titleOffer === null || playerComponent.titleOffer !== title) {
      return;
   }

   // Give the title
   const tribesmanComponent = TribesmanComponentArray.getComponent(player);
   const titleGenerationInfo = generateTitle(title);
   tribesmanComponent.titles.push(titleGenerationInfo);
   
   playerComponent.titleOffer = null;
}

export function rejectTitleOffer(player: Entity, title: TribesmanTitle): void {
   const playerComponent = PlayerComponentArray.getComponent(player);
   if (playerComponent.titleOffer === null || playerComponent.titleOffer === title) {
      playerComponent.titleOffer = null;
   }
}

// @Cleanup: two very similar functions

export function tribeMemberHasTitle(tribesmanComponent: TribesmanComponent, title: TribesmanTitle): boolean {
   for (let i = 0; i < tribesmanComponent.titles.length; i++) {
      const titleGenerationInfo = tribesmanComponent.titles[i];

      if (titleGenerationInfo.title === title) {
         return true;
      }
   }

   return false;
}

export function hasTitle(entityID: number, title: TribesmanTitle): boolean {
   if (!TribesmanComponentArray.hasComponent(entityID)) {
      return false;
   }

   const tribesmanComponent = TribesmanComponentArray.getComponent(entityID);

   for (let i = 0; i < tribesmanComponent.titles.length; i++) {
      const currentTitle = tribesmanComponent.titles[i].title;
      if (currentTitle === title) {
         return true;
      }
   }

   return false;
}

export function forceAddTitle(entityID: Entity, title: TribesmanTitle): void {
   const tribesmanComponent = TribesmanComponentArray.getComponent(entityID);
   
   // Make sure they don't already have the title
   for (let i = 0; i < tribesmanComponent.titles.length; i++) {
      const titleGenerationInfo = tribesmanComponent.titles[i];

      if (titleGenerationInfo.title === title) {
         return;
      }
   }

   const titleGenerationInfo = generateTitle(title);
   tribesmanComponent.titles.push(titleGenerationInfo);
}

export function removeTitle(entityID: Entity, title: TribesmanTitle): void {
   const tribesmanComponent = TribesmanComponentArray.getComponent(entityID);

   for (let i = 0; i < tribesmanComponent.titles.length; i++) {
      const titleGenerationInfo = tribesmanComponent.titles[i];

      if (titleGenerationInfo.title === title) {
         tribesmanComponent.titles.splice(i, 1);
         break;
      }
   }
}

// @Cleanup: Move to tick function
const tickInventoryUseInfo = (tribeMember: Entity, limb: LimbInfo): void => {
   switch (limb.action) {
      case LimbAction.eat:
      case LimbAction.useMedicine: {
         limb.foodEatingTimer -= Settings.DT_S;
   
         if (limb.foodEatingTimer <= 0) {
            const inventory = limb.associatedInventory;
            
            const selectedItem = inventory.itemSlots[limb.selectedItemSlot];
            if (typeof selectedItem !== "undefined") {
               const itemCategory = ITEM_TYPE_RECORD[selectedItem.type];
               if (itemCategory === "healing") {
                  useItem(tribeMember, selectedItem, inventory.name, limb.selectedItemSlot);
   
                  const itemInfo = ITEM_INFO_RECORD[selectedItem.type] as ConsumableItemInfo;
                  limb.foodEatingTimer = itemInfo.consumeTime;

                  if (TribesmanAIComponentArray.hasComponent(tribeMember) && Math.random() < TITLE_REWARD_CHANCES.BERRYMUNCHER_REWARD_CHANCE) {
                     awardTitle(tribeMember, TribesmanTitle.berrymuncher);
                  }

                  // @HACK!!! so that they stop eating food when they dont need to
                  const healthComponent = HealthComponentArray.getComponent(tribeMember);
                  if (healthComponent.health >= healthComponent.maxHealth) {
                     // @SQUEAM
                     // limb.action = LimbAction.none;
                  }
               }
            }
         }
         break;
      }
      case LimbAction.loadCrossbow: {
         const loadProgress = limb.crossbowLoadProgressRecord[limb.selectedItemSlot];
         if (typeof loadProgress === "undefined") {
            limb.crossbowLoadProgressRecord[limb.selectedItemSlot] = Settings.DT_S;
         } else {
            limb.crossbowLoadProgressRecord[limb.selectedItemSlot]! += Settings.DT_S;
         }
         
         if (limb.crossbowLoadProgressRecord[limb.selectedItemSlot]! >= 1) {
            limb.crossbowLoadProgressRecord[limb.selectedItemSlot] = 1;
            limb.action = LimbAction.none;
         }
         
         break;
      }
   }
}

function onTick(tribeMember: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(tribeMember);
   const tribeMemberHitbox = transformComponent.hitboxes[0];
      
   const chance = TITLE_REWARD_CHANCES.SPRINTER_REWARD_CHANCE_PER_SPEED * getHitboxVelocity(tribeMemberHitbox).magnitude();
   if (Math.random() < chance * Settings.DT_S) {
      awardTitle(tribeMember, TribesmanTitle.sprinter);
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

   const tribeMemberTile = getHitboxTile(tribeMemberHitbox);
   const tileType = getEntityLayer(tribeMember).getTileType(tribeMemberTile);

   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
   const armour = armourInventory.getItem(1);
   
   transformComponent.overrideMoveSpeedMultiplier = tileType === TileType.snow && armour !== null && (armour.type === ItemType.frostArmour || armour.type === ItemType.winterskinArmour);
}

function onDeath(entity: Entity, attackingEntity: Entity | null): void {
   if (attackingEntity !== null) {
      adjustTribesmanRelationsAfterKill(entity, attackingEntity);
   }
}

function onKill(entity: Entity, deadEntity: Entity): void {
   if (Math.random() < TITLE_REWARD_CHANCES.BLOODAXE_REWARD_CHANCE) {
      awardTitle(entity, TribesmanTitle.bloodaxe);
   } else if (Math.random() < TITLE_REWARD_CHANCES.DEATHBRINGER_REWARD_CHANCE) {
      awardTitle(entity, TribesmanTitle.deathbringer);
   } else if (getEntityType(deadEntity) === EntityType.yeti && Math.random() < TITLE_REWARD_CHANCES.YETISBANE_REWARD_CHANCE) {
      awardTitle(entity, TribesmanTitle.yetisbane);
   }
}

function onTakeDamage(tribeMember: Entity, _hitHitbox: Hitbox, attackingEntity: Entity | null): void {
   if (attackingEntity === null) {
      return;
   }

   const tribeComponent = TribeComponentArray.getComponent(tribeMember);
   tribeComponent.tribe.addAttackingEntity(attackingEntity);
   
   const tribesmanComponent = TribesmanComponentArray.getComponent(tribeMember);
   for (let i = 0; i < tribesmanComponent.fishFollowerIDs.length; i++) {
      const fish = tribesmanComponent.fishFollowerIDs[i];
      // @Hack?
      onFishLeaderHurt(fish, attackingEntity);
   }
   
   // Adjust the tribesman relations
   if (TribeComponentArray.hasComponent(attackingEntity)) {
      const otherTribeComponent = TribeComponentArray.getComponent(attackingEntity);
      adjustTribeRelations(tribeComponent.tribe, otherTribeComponent.tribe, tribeMember, -30, -15);
   }
}

function onDealDamage(entity: Entity, attackedEntity: Entity): void {
   // Award gardener title for hitting berry bushes
   if (getEntityType(attackedEntity) === EntityType.berryBush && Math.random() < TITLE_REWARD_CHANCES.GARDENER_REWARD_CHANCE) {
      awardTitle(entity, TribesmanTitle.gardener);
   }
}