import { ServerComponentType, TribesmanAIType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { ComponentArray } from "./ComponentArray";
import Tribe from "../Tribe";
import { EntityRelationship, TribeComponentArray } from "./TribeComponent";
import { CRAFTING_RECIPES } from "battletribes-shared/items/crafting-recipes";
import { ItemType } from "battletribes-shared/items/items";
import { Entity } from "battletribes-shared/entities";
import { tickTribesman } from "../entities/tribes/tribesman-ai/tribesman-ai";
import { Packet } from "battletribes-shared/packets";
import { entityExists, getGameTicks } from "../world";
import { HutComponentArray } from "./HutComponent";
import { TribesmanComponentArray } from "./TribesmanComponent";

// @Incomplete: periodically remove dead entities from the relations object
// @Incomplete: only keep track of tribesman relations

const enum Vars {
   MAX_ENEMY_RELATION_THRESHOLD = -30,
   MIN_ACQUAINTANCE_RELATION_THRESOLD = 50,
   ITEM_THROW_COOLDOWN_TICKS = (0.2 * Settings.TICK_RATE) | 0
}

/** Stores how much gifting an item to a tribesman increases your relations with them */
const GIFT_APPRECIATION_WEIGHTS: Record<ItemType, number> = {
   [ItemType.wood]: 1,
   [ItemType.workbench]: 3,
   [ItemType.wooden_sword]: 5,
   [ItemType.wooden_axe]: 5,
   [ItemType.wooden_pickaxe]: 5,
   [ItemType.wooden_hammer]: 5,
   [ItemType.berry]: 1,
   [ItemType.raw_beef]: 1,
   [ItemType.cooked_beef]: 2,
   [ItemType.rock]: 1,
   [ItemType.stone_sword]: 8,
   [ItemType.stone_axe]: 8,
   [ItemType.stone_pickaxe]: 8,
   [ItemType.stone_hammer]: 8,
   [ItemType.leather]: 2,
   [ItemType.leather_backpack]: 8,
   [ItemType.cactus_spine]: 0.5,
   [ItemType.yeti_hide]: 2.5,
   [ItemType.frostcicle]: 1,
   [ItemType.slimeball]: 1,
   [ItemType.eyeball]: 1,
   [ItemType.flesh_sword]: 8,
   [ItemType.tribe_totem]: 10,
   [ItemType.worker_hut]: 15,
   [ItemType.barrel]: 8,
   [ItemType.frostSword]: 10,
   [ItemType.frostPickaxe]: 10,
   [ItemType.frostAxe]: 10,
   [ItemType.frostArmour]: 10,
   [ItemType.campfire]: 5,
   [ItemType.furnace]: 9,
   [ItemType.wooden_bow]: 7,
   [ItemType.meat_suit]: 4,
   [ItemType.deepfrost_heart]: 4,
   [ItemType.raw_fish]: 1,
   [ItemType.cooked_fish]: 2,
   [ItemType.fishlord_suit]: 4,
   [ItemType.gathering_gloves]: 5,
   [ItemType.leather_armour]: 8,
   [ItemType.woodenSpear]: 5,
   [ItemType.stoneSpear]: 5,
   [ItemType.paper]: 2,
   [ItemType.research_bench]: 12,
   [ItemType.wooden_wall]: 3,
   [ItemType.stone_battleaxe]: 10,
   [ItemType.living_rock]: 2,
   [ItemType.planter_box]: 7,
   [ItemType.reinforced_bow]: 10,
   [ItemType.crossbow]: 10,
   [ItemType.ice_bow]: 7,
   [ItemType.poop]: -2,
   [ItemType.wooden_spikes]: 3,
   [ItemType.punji_sticks]: 4,
   [ItemType.ballista]: 20,
   [ItemType.sling_turret]: 10,
   [ItemType.healing_totem]: 10,
   [ItemType.leaf]: 0,
   [ItemType.herbal_medicine]: 3,
   [ItemType.leaf_suit]: 3,
   [ItemType.seed]: 1,
   [ItemType.gardening_gloves]: 9,
   [ItemType.wooden_fence]: 2,
   [ItemType.fertiliser]: 2,
   [ItemType.frostshaper]: 5,
   [ItemType.stonecarvingTable]: 6,
   [ItemType.woodenShield]: 3,
   [ItemType.slingshot]: 1,
   [ItemType.woodenBracings]: 1,
   [ItemType.fireTorch]: 1,
   [ItemType.slurb]: 1,
   [ItemType.slurbTorch]: 1,
   [ItemType.rawYetiFlesh]: 1,
   [ItemType.cookedYetiFlesh]: 1,
   [ItemType.mithrilOre]: 1,
   [ItemType.mithrilBar]: 1,
   [ItemType.mithrilSword]: 1,
   [ItemType.mithrilPickaxe]: 1,
   [ItemType.mithrilAxe]: 1,
   [ItemType.mithrilArmour]: 1,
   [ItemType.scrappy]: 1,
   [ItemType.cogwalker]: 1,
   [ItemType.automatonAssembler]: 1,
   [ItemType.mithrilAnvil]: 1,
   [ItemType.animalStaff]: 1,
   [ItemType.woodenArrow]: 1,
   [ItemType.tamingAlmanac]: 1,
   [ItemType.floorSign]: 1,
   [ItemType.pricklyPear]: 1,
   [ItemType.rawCrabMeat]: 1,
   [ItemType.cookedCrabMeat]: 1,
   [ItemType.chitin]: 1,
   [ItemType.crabplateArmour]: 1,
   [ItemType.dustfleaEgg]: 1,
   [ItemType.snowberry]: 1,
   [ItemType.rawSnobeMeat]: 1,
   [ItemType.snobeStew]: 1,
   [ItemType.snobeHide]: 1,
   [ItemType.inguSerpentTooth]: 1,
   [ItemType.iceWringer]: 1,
   [ItemType.rawTukmokMeat]: 1,
   [ItemType.cookedTukmokMeat]: 1,
   [ItemType.tukmokFurHide]: 1,
   [ItemType.winterskinArmour]: 1,
   [ItemType.ivoryTusk]: 1,
   [ItemType.ivorySpear]: 1,
   [ItemType.sock]: 1,
   [ItemType.mrpebbles]: 1
};

export const enum TribesmanPathType {
   default,
   haulingToBarrel,
   /** Indicates that the path was caused by another tribesman wanting them to come */
   tribesmanRequest
}

export class TribesmanAIComponent {
   /** ID of the hut which spawned the tribesman */
   public hut: Entity = 0;

   public currentAIType = TribesmanAIType.idle;

   // @Memory @Speed: This is only used to clear the ResearchBenchComponent's preemptiveOccupeeID value when
   // the tribesmen finishes researching, is there some better way which doesn't need having this value?
   public targetResearchBenchID = 0;

   /** Artificial cooldown added to tribesmen to make them a bit worse at bow combat */
   public extraBowCooldownTicks = 0;

   /** The number of ticks that had occured when the tribesman last had line of sight to an enemy */
   public lastEnemyLineOfSightTicks = 0;

   // @Cleanup: name
   public helpX = 0;
   public helpY = 0;
   public ticksSinceLastHelpRequest = 99999;

   /** Stores relations with tribesman from other tribes */
   public tribesmanRelations: Partial<Record<number, number>> = {};

   public currentCraftingRecipeIdx = 0;
   public currentCraftingTicks = 0;

   public lastItemThrowTicks = 0;

   // @Hack
   public targetEntity: Entity = 0;
}

export const TribesmanAIComponentArray = new ComponentArray<TribesmanAIComponent>(ServerComponentType.tribesmanAI, true, getDataLength, addDataToPacket);
TribesmanAIComponentArray.onJoin = onJoin;
TribesmanAIComponentArray.onTick = {
   tickInterval: 1,
   func: tickTribesman
};
TribesmanAIComponentArray.onRemove = onRemove;

function onJoin(entity: Entity): void {
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(entity);
   tribesmanAIComponent.lastEnemyLineOfSightTicks = getGameTicks();
}

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity, player: Entity | null): void {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity);

   let craftingProgress: number;
   let craftingItemType: ItemType;
   if (tribesmanComponent.currentAIType === TribesmanAIType.crafting) {
      const recipe = CRAFTING_RECIPES[tribesmanComponent.currentCraftingRecipeIdx];
      craftingProgress = tribesmanComponent.currentCraftingTicks / recipe.aiCraftTimeTicks;

      craftingItemType = recipe.product;
   } else {
      craftingProgress = 0;
      craftingItemType = 0;
   }

   packet.writeNumber(tribesmanComponent.currentAIType);
   const relationsWithPlayer = player !== null && typeof tribesmanComponent.tribesmanRelations[player] !== "undefined" ? tribesmanComponent.tribesmanRelations[player]! : 0;
   packet.writeNumber(relationsWithPlayer);
   packet.writeNumber(craftingItemType);
   packet.writeNumber(craftingProgress);
}

const adjustTribesmanRelations = (tribesmanID: number, otherTribesmanID: number, adjustment: number): void => {
   // Players don't have relations
   if (!TribesmanAIComponentArray.hasComponent(tribesmanID)) {
      return;
   }
   
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesmanID);
   const relations = tribesmanComponent.tribesmanRelations;

   if (typeof relations[otherTribesmanID] === "undefined") {
      relations[otherTribesmanID] = adjustment;
   } else {
      relations[otherTribesmanID]! += adjustment;
   }

   if (relations[otherTribesmanID]! < -100) {
      relations[otherTribesmanID] = -100;
   } else if (relations[otherTribesmanID]! > 100) {
      relations[otherTribesmanID] = 100;
   }
}

export function adjustTribeRelations(attackedTribe: Tribe, attackingTribe: Tribe, attackedEntityID: number, attackedAdjustment: number, defaultAdjustment: number): void {
   if (attackedTribe === attackingTribe) {
      return;
   }
   
   // @Speed
   for (const tribesmanID of attackingTribe.entities) {
      if (!TribesmanComponentArray.hasComponent(tribesmanID)) {
         continue;
      }

      for (const attackedTribesmanID of attackedTribe.entities) {
         if (!TribesmanComponentArray.hasComponent(attackedTribesmanID)) {
            continue;
         }

         const adjustment = attackedTribesmanID === attackedEntityID ? attackedAdjustment : defaultAdjustment;
         adjustTribesmanRelations(attackedTribesmanID, tribesmanID, adjustment);
      }
   }
}

// @Incomplete @Bug: this doesn't do anything rn as the data is lost when the tribesman is removed. need to keep track of it across tribesman lives.
export function adjustTribesmanRelationsAfterKill(tribesman: Entity, attackingTribesman: Entity): void {
   if (!TribeComponentArray.hasComponent(attackingTribesman)) {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const otherTribeComponent = TribeComponentArray.getComponent(attackingTribesman);

   adjustTribeRelations(tribeComponent.tribe, otherTribeComponent.tribe, tribesman, -200, -200);
}

export function adjustTribesmanRelationsAfterGift(tribesman: Entity, giftingTribesman: Entity, giftItemType: ItemType, giftItemAmount: number): void {
   const adjustment = GIFT_APPRECIATION_WEIGHTS[giftItemType] * giftItemAmount;
   adjustTribesmanRelations(tribesman, giftingTribesman, adjustment);
}

export function getTribesmanRelationship(tribesman: Entity, comparingTribesman: Entity): EntityRelationship {
   // If the two tribesman are of the same tribe, they are friendly
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const otherTribeComponent = TribeComponentArray.getComponent(comparingTribesman);
   if (tribeComponent.tribe === otherTribeComponent.tribe) {
      return EntityRelationship.friendly;
   } 
   
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   const relations = tribesmanComponent.tribesmanRelations;

   if (typeof relations[comparingTribesman] === "undefined") {
      return EntityRelationship.neutral;
   } else {
      const relation = relations[comparingTribesman]!;
      if (relation <= Vars.MAX_ENEMY_RELATION_THRESHOLD) {
         return EntityRelationship.enemy;
      } else if (relation >= Vars.MIN_ACQUAINTANCE_RELATION_THRESOLD) {
         return EntityRelationship.acquaintance;
      } else {
         return EntityRelationship.neutral;
      }
   }
}

export function getItemGiftAppreciation(itemType: ItemType): number {
   return GIFT_APPRECIATION_WEIGHTS[itemType];
}

export function itemThrowIsOnCooldown(tribesmanComponent: TribesmanAIComponent): boolean {
   const ticksSinceThrow = getGameTicks() - tribesmanComponent.lastItemThrowTicks;
   return ticksSinceThrow <= Vars.ITEM_THROW_COOLDOWN_TICKS;
}

function onRemove(worker: Entity): void {
   // 
   // Attempt to respawn the tribesman when it is killed
   // 
   
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(worker);

   // Only respawn the tribesman if their hut is alive
   if (!entityExists(tribesmanComponent.hut)) {
      return;
   }
   
   const hutComponent = HutComponentArray.getComponent(tribesmanComponent.hut);
   if (hutComponent.isRecalling) {
      hutComponent.hasSpawnedTribesman = false;
   } else {
      const tribeComponent = TribeComponentArray.getComponent(worker);
      tribeComponent.tribe.respawnTribesman(tribesmanComponent.hut);
   }
}