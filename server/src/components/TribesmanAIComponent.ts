import { PathfindingNodeIndex } from "battletribes-shared/client-server-types";
import { ServerComponentType, TribesmanAIType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { randInt } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import Board from "../Board";
import Tribe, { BuildingPlan } from "../Tribe";
import { EntityRelationship, TribeComponentArray } from "./TribeComponent";
import { TribesmanGoal } from "../entities/tribes/tribesman-ai/tribesman-goals";
import { CRAFTING_RECIPES } from "battletribes-shared/items/crafting-recipes";
import { ItemType } from "battletribes-shared/items/items";
import { EntityID } from "battletribes-shared/entities";
import { tickTribesman } from "../entities/tribes/tribesman-ai/tribesman-ai";
import { Packet } from "battletribes-shared/packets";

// @Incomplete: periodically remove dead entities from the relations object
// @Incomplete: only keep track of tribesman relations

const enum Vars {
   MAX_ENEMY_RELATION_THRESHOLD = -30,
   MIN_ACQUAINTANCE_RELATION_THRESOLD = 50,
   ITEM_THROW_COOLDOWN_TICKS = (0.2 * Settings.TPS) | 0
}

export interface TribesmanAIComponentParams {
   hut: EntityID;
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
   [ItemType.frost_armour]: 10,
   [ItemType.campfire]: 5,
   [ItemType.furnace]: 9,
   [ItemType.wooden_bow]: 7,
   [ItemType.meat_suit]: 4,
   [ItemType.deepfrost_heart]: 4,
   [ItemType.deepfrost_sword]: 15,
   [ItemType.deepfrost_pickaxe]: 15,
   [ItemType.deepfrost_axe]: 15,
   [ItemType.deepfrost_armour]: 20,
   [ItemType.raw_fish]: 1,
   [ItemType.cooked_fish]: 2,
   [ItemType.fishlord_suit]: 4,
   [ItemType.gathering_gloves]: 5,
   [ItemType.throngler]: 7,
   [ItemType.leather_armour]: 8,
   [ItemType.spear]: 5,
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
   [ItemType.woodenShield]: 3
};

export const enum TribesmanPathType {
   default,
   haulingToBarrel,
   /** Indicates that the path was caused by another tribesman wanting them to come */
   tribesmanRequest
}

export class TribesmanAIComponent {
   /** ID of the hut which spawned the tribesman */
   public hutID: number;

   public currentAIType = TribesmanAIType.idle;
   
   public targetPatrolPositionX = -1;
   public targetPatrolPositionY = -1;

   // @Memory @Speed: This is only used to clear the ResearchBenchComponent's preemptiveOccupeeID value when
   // the tribesmen finishes researching, is there some better way which doesn't need having this value?
   public targetResearchBenchID = 0;

   public rawPath = new Array<PathfindingNodeIndex>();
   public path: Array<PathfindingNodeIndex> = [];
   public pathfindingTargetNode: PathfindingNodeIndex = Number.MAX_SAFE_INTEGER;
   public pathType = TribesmanPathType.default;
   public isPathfinding = false;

   /** Artificial cooldown added to tribesmen to make them a bit worse at bow combat */
   public extraBowCooldownTicks = 0;

   /** The number of ticks that had occured when the tribesman last had line of sight to an enemy */
   public lastEnemyLineOfSightTicks: number;

   // @Cleanup: name
   public helpX = 0;
   public helpY = 0;
   public ticksSinceLastHelpRequest = 99999;

   public personalBuildingPlan: BuildingPlan | null = null;

   /** Stores relations with tribesman from other tribes */
   public tribesmanRelations: Partial<Record<number, number>> = {};

   // @Cleanup: Unify with player username in tribemember component
   public readonly name: number;
   // @Bug: will favour certain names more.
   public untitledDescriptor = randInt(0, 99);

   public goals: ReadonlyArray<TribesmanGoal> = [];

   public currentCraftingRecipeIdx = 0;
   public currentCraftingTicks = 0;

   public lastItemThrowTicks = 0;

   constructor(params: TribesmanAIComponentParams) {
      this.hutID = params.hut;
      this.lastEnemyLineOfSightTicks = Board.ticks;
      // @Bug: will favour certain names more.
      this.name = randInt(0, 99);
   }
}

export const TribesmanAIComponentArray = new ComponentArray<TribesmanAIComponent>(ServerComponentType.tribesmanAI, true, {
   onTick: {
      tickInterval: 1,
      func: tickTribesman
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 7 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID, player: EntityID | null): void {
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

   packet.addNumber(tribesmanComponent.name);
   packet.addNumber(tribesmanComponent.untitledDescriptor);
   packet.addNumber(tribesmanComponent.currentAIType);
   const relationsWithPlayer = player !== null && typeof tribesmanComponent.tribesmanRelations[player] !== "undefined" ? tribesmanComponent.tribesmanRelations[player]! : 0;
   packet.addNumber(relationsWithPlayer);
   packet.addNumber(craftingItemType);
   packet.addNumber(craftingProgress);
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
   for (let i = 0; i < attackingTribe.tribesmanIDs.length; i++) {
      const tribesmanID = attackingTribe.tribesmanIDs[i];

      for (let j = 0; j < attackedTribe.tribesmanIDs.length; j++) {
         const attackedTribesmanID = attackedTribe.tribesmanIDs[j];

         const adjustment = attackedTribesmanID === attackedEntityID ? attackedAdjustment : defaultAdjustment;
         adjustTribesmanRelations(attackedTribesmanID, tribesmanID, adjustment);
      }
   }
}

export function adjustTribesmanRelationsAfterHurt(tribesman: EntityID, attackingTribesman: EntityID): void {
   if (!TribeComponentArray.hasComponent(attackingTribesman)) {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const otherTribeComponent = TribeComponentArray.getComponent(attackingTribesman);

   adjustTribeRelations(tribeComponent.tribe, otherTribeComponent.tribe, tribesman, -30, -15);
}

// @Incomplete @Bug: this doesn't do anything rn as the data is lost when the tribesman is removed. need to keep track of it across tribesman lives.
export function adjustTribesmanRelationsAfterKill(tribesman: EntityID, attackingTribesman: EntityID): void {
   if (!TribeComponentArray.hasComponent(attackingTribesman)) {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const otherTribeComponent = TribeComponentArray.getComponent(attackingTribesman);

   adjustTribeRelations(tribeComponent.tribe, otherTribeComponent.tribe, tribesman, -200, -200);
}

export function adjustTribesmanRelationsAfterGift(tribesman: EntityID, giftingTribesman: EntityID, giftItemType: ItemType, giftItemAmount: number): void {
   const adjustment = GIFT_APPRECIATION_WEIGHTS[giftItemType] * giftItemAmount;
   adjustTribesmanRelations(tribesman, giftingTribesman, adjustment);
}

export function getTribesmanRelationship(tribesman: EntityID, comparingTribesman: EntityID): EntityRelationship {
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
   const ticksSinceThrow = Board.ticks - tribesmanComponent.lastItemThrowTicks;
   return ticksSinceThrow <= Vars.ITEM_THROW_COOLDOWN_TICKS;
}