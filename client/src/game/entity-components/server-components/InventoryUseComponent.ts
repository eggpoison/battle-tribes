import { createZeroedLimbState, LimbConfiguration, LimbState, SHIELD_BASH_PUSHED_LIMB_STATE, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BLOCKING_LIMB_STATE, RESTING_LIMB_STATES, SPEAR_CHARGED_LIMB_STATE, interpolateLimbState, copyLimbState, PacketReader, InventoryName, ItemType, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, itemInfoIsTool, Settings, BlockType, ServerComponentType, Point, lerp, randAngle, randFloat, randItem, Entity, EntityType, LimbAction } from "webgl-test-shared";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import Board, { getElapsedTimeInSeconds, getSecondsSinceTickTimestamp } from "../../Board";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import Particle from "../../Particle";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../../rendering/webgl/particle-rendering";
import { animateLimb, createCraftingAnimationParticles, createMedicineAnimationParticles, generateRandomLimbPosition, updateBandageRenderPart, updateCustomItemRenderPart } from "../../limb-animations";
import { createBlockParticle, createDeepFrostHeartBloodParticles, createEmberParticle, createSlurbParticle, createSmokeParticle } from "../../particles";
import { VisualRenderPart, RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { EntityComponentData, getEntityRenderInfo } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { Light, removeLight } from "../../lights";
import { getRenderPartRenderPosition } from "../../rendering/render-part-matrices";
import { getHumanoidRadius } from "./TribesmanComponent";
import { playerInstance } from "../../player";
import { getHitboxVelocity } from "../../hitboxes";
import { currentSnapshot, tickIntervalHasPassed } from "../../client";
import { updatePlayerItems } from "../../player-action-handler";
import { inventoryState } from "../../../ui-state/inventory-state.svelte";

export interface LimbInfo {
   selectedItemSlot: number;
   heldItemType: ItemType | null;
   readonly inventoryName: InventoryName;
   spearWindupCooldowns: Partial<Record<number, number>>;
   crossbowLoadProgressRecord: Partial<Record<number, number>>;
   foodEatingTimer: number;
   action: LimbAction;
   lastAttackTicks: number;
   lastEatTicks: number;
   // @Cleanup: May be able to merge all 3 of these into 1
   lastBowChargeTicks: number;
   lastSpearChargeTicks: number;
   lastBattleaxeChargeTicks: number;
   lastCrossbowLoadTicks: number;
   lastCraftTicks: number;
   lastAttackWindupTicks: number;
   thrownBattleaxeItemID: number;
   lastAttackCooldown: number;
   currentActionElapsedTicks: number;
   currentActionDurationTicks: number;
   currentActionPauseTicksRemaining: number;
   currentActionRate: number;

   swingAttack: Entity;
   blockAttack: Entity;

   currentActionStartLimbState: LimbState;
   currentActionEndLimbState: LimbState;

   animationStartOffset: Point;
   animationEndOffset: Point;
   animationDurationTicks: number;
   animationTicksElapsed: number;

   torchLight: Light | null;

   // @HACK fo da blocking effects which will be clean up into serverside based thing l@r anyways.
   lastBlockTick: number;
   blockPositionX: number;
   blockPositionY: number;
   blockType: BlockType;
}

export interface InventoryUseComponentData {
   readonly limbInfos: Array<LimbInfo>;
}

export interface InventoryUseComponent {
   readonly limbInfos: Array<LimbInfo>;

   readonly limbAttachPoints: Array<RenderAttachPoint>;
   readonly limbRenderParts: Array<VisualRenderPart>;
   readonly activeItemRenderParts: Record<number, TexturedRenderPart>;
   readonly inactiveCrossbowArrowRenderParts: Record<number, VisualRenderPart>;
   readonly arrowRenderParts: Record<number, VisualRenderPart>;

   customItemRenderPart: TexturedRenderPart | null;
   readonly bandageRenderParts: Array<VisualRenderPart>;
}

/** Decimal percentage of total attack animation time spent doing the lunge part of the animation */
const ATTACK_LUNGE_TIME = 0.3;

const FOOD_EAT_INTERVAL = 0.3;

const ZOMBIE_HAND_RESTING_ROTATION = 0;
const ZOMBIE_HAND_RESTING_DIRECTION = Math.PI / 4;
const ZOMBIE_HAND_RESTING_OFFSET = 32;
   
const HAND_RESTING_DIRECTION = Math.PI * 0.4;
const HAND_RESTING_ROTATION = 0;

const ITEM_RESTING_ROTATION = 0;

const BOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "items/large/wooden-bow.png",
   "miscellaneous/wooden-bow-charge-1.png",
   "miscellaneous/wooden-bow-charge-2.png",
   "miscellaneous/wooden-bow-charge-3.png",
   "miscellaneous/wooden-bow-charge-4.png",
   "miscellaneous/wooden-bow-charge-5.png"
];

const REINFORCED_BOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "items/large/reinforced-bow.png",
   "miscellaneous/reinforced-bow-charge-1.png",
   "miscellaneous/reinforced-bow-charge-2.png",
   "miscellaneous/reinforced-bow-charge-3.png",
   "miscellaneous/reinforced-bow-charge-4.png",
   "miscellaneous/reinforced-bow-charge-5.png"
];

const ICE_BOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "items/large/ice-bow.png",
   "miscellaneous/ice-bow-charge-1.png",
   "miscellaneous/ice-bow-charge-2.png",
   "miscellaneous/ice-bow-charge-3.png",
   "miscellaneous/ice-bow-charge-4.png",
   "miscellaneous/ice-bow-charge-5.png"
];

const CROSSBOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "items/large/crossbow.png",
   "miscellaneous/crossbow-charge-1.png",
   "miscellaneous/crossbow-charge-2.png",
   "miscellaneous/crossbow-charge-3.png",
   "miscellaneous/crossbow-charge-4.png",
   "miscellaneous/crossbow-charge-5.png"
];

type FilterHealingItemTypes<T extends ItemType> = (typeof ITEM_TYPE_RECORD)[T] extends "healing" ? never : T;

// @Robustness: this should be determined automatically
const FOOD_EATING_COLOURS: { [T in ItemType as Exclude<T, FilterHealingItemTypes<T>>]: Array<ParticleColour> } = {
   [ItemType.berry]: [
      [222/255, 57/255, 42/255],
      [181/255, 12/255, 9/255],
      [217/255, 26/255, 20/255],
      [227/255, 137/255, 129/255]
   ],
   [ItemType.raw_beef]: [
      [117/255, 25/255, 40/255],
      [153/255, 29/255, 37/255],
      [217/255, 41/255, 41/255],
      [222/255, 58/255, 58/255],
      [222/255, 87/255, 87/255],
      [217/255, 124/255, 124/255],
      [217/255, 173/255, 173/255]
   ],
   [ItemType.cooked_beef]: [
      [33/255, 24/255, 12/255],
      [92/255, 55/255, 43/255],
      [123/255, 78/255, 54/255],
      [150/255, 106/255, 73/255],
      [159/255, 124/255, 86/255],
      [164/255, 131/255, 96/255]
   ],
   [ItemType.raw_fish]: [
      [33/255, 24/255, 12/255],
      [92/255, 55/255, 43/255],
      [123/255, 78/255, 54/255],
      [150/255, 106/255, 73/255],
      [159/255, 124/255, 86/255],
      [164/255, 131/255, 96/255]
   ],
   [ItemType.cooked_fish]: [
      [33/255, 24/255, 12/255],
      [92/255, 55/255, 43/255],
      [123/255, 78/255, 54/255],
      [150/255, 106/255, 73/255],
      [159/255, 124/255, 86/255],
      [164/255, 131/255, 96/255]
   ],
   // @Incomplete
   [ItemType.herbal_medicine]: [
      [33/255, 24/255, 12/255],
      [92/255, 55/255, 43/255],
      [123/255, 78/255, 54/255],
      [150/255, 106/255, 73/255],
      [159/255, 124/255, 86/255],
      [164/255, 131/255, 96/255]
   ],
   // @Incomplete
   [ItemType.rawYetiFlesh]: [
      [33/255, 24/255, 12/255],
      [92/255, 55/255, 43/255],
      [123/255, 78/255, 54/255],
      [150/255, 106/255, 73/255],
      [159/255, 124/255, 86/255],
      [164/255, 131/255, 96/255]
   ],
   [ItemType.cookedYetiFlesh]: [
      [33/255, 24/255, 12/255],
      [92/255, 55/255, 43/255],
      [123/255, 78/255, 54/255],
      [150/255, 106/255, 73/255],
      [159/255, 124/255, 86/255],
      [164/255, 131/255, 96/255]
   ],
   [ItemType.pricklyPear]: [
      [117/255, 25/255, 40/255],
      [153/255, 29/255, 37/255],
      [217/255, 41/255, 41/255],
      [222/255, 58/255, 58/255],
      [222/255, 87/255, 87/255],
      [217/255, 124/255, 124/255],
      [217/255, 173/255, 173/255]
   ],
   [ItemType.rawCrabMeat]: [
      [117/255, 25/255, 40/255],
      [153/255, 29/255, 37/255],
      [217/255, 41/255, 41/255],
      [222/255, 58/255, 58/255],
      [222/255, 87/255, 87/255],
      [217/255, 124/255, 124/255],
      [217/255, 173/255, 173/255]
   ],
   [ItemType.cookedCrabMeat]: [
      [117/255, 25/255, 40/255],
      [153/255, 29/255, 37/255],
      [217/255, 41/255, 41/255],
      [222/255, 58/255, 58/255],
      [222/255, 87/255, 87/255],
      [217/255, 124/255, 124/255],
      [217/255, 173/255, 173/255]
   ],
   [ItemType.dustfleaEgg]: [
      [166/255, 84/255, 156/255],
      [190/255, 96/255, 166/255],
      [211/255, 107/255, 184/255],
      [216/255, 127/255, 201/255],
   ],
   [ItemType.snowberry]: [
      [160/255, 216/255, 237/255],
      [118/255, 195/255, 223/255],
      [111/255, 107/255, 184/255],
   ],
   [ItemType.rawSnobeMeat]: [
      [184/255, 78/255, 97/255],
      [217/255, 92/255, 111/255],
      [217/255, 151/255, 161/255],
   ],
   [ItemType.snobeStew]: [
      [184/255, 78/255, 97/255],
      [217/255, 92/255, 111/255],
      [217/255, 151/255, 161/255],
   ],
   [ItemType.rawTukmokMeat]: [
      [184/255, 78/255, 97/255],
      [217/255, 92/255, 111/255],
      [217/255, 151/255, 161/255],
   ],
   [ItemType.cookedTukmokMeat]: [
      [184/255, 78/255, 97/255],
      [217/255, 92/255, 111/255],
      [217/255, 151/255, 161/255],
   ],
};

const BOW_CHARGE_DOMINANT_START_LIMB_STATE: LimbState = {
   direction: 0,
   extraOffset: 0,
   angle: 0,
   extraOffsetX: 10,
   extraOffsetY: 30
};
const BOW_CHARGE_DOMINANT_END_LIMB_STATE: LimbState = {
   direction: 0,
   extraOffset: 0,
   angle: 0,
   extraOffsetX: 10,
   extraOffsetY: 10
};
const BOW_CHARGE_NON_DOMINANT_LIMB_STATE: LimbState = {
   direction: 0,
   extraOffset: 0,
   angle: 0,
   extraOffsetX: 10,
   extraOffsetY: 40
};

// @Cleanup: unused?
type InventoryUseEntityType = EntityType.player | EntityType.tribeWorker | EntityType.tribeWarrior | EntityType.zombie;

export function getCurrentLimbState(limb: LimbInfo): LimbState {
   if (limb.currentActionDurationTicks === 0 || limb.currentActionElapsedTicks >= limb.currentActionDurationTicks) {
      // If the action has duration 0, assume that it is finished
      return copyLimbState(limb.currentActionEndLimbState);
   } else {
      const progress = limb.currentActionElapsedTicks / limb.currentActionDurationTicks;
      return interpolateLimbState(limb.currentActionStartLimbState, limb.currentActionEndLimbState, progress);
   }
}

const createZeroedLimbInfo = (inventoryName: InventoryName): LimbInfo => {
   return {
      selectedItemSlot: 0,
      heldItemType: null,
      inventoryName: inventoryName,
      spearWindupCooldowns: {},
      crossbowLoadProgressRecord: {},
      foodEatingTimer: 0,
      action: 0,
      lastAttackTicks: 0,
      lastEatTicks: 0,
      lastBowChargeTicks: 0,
      lastSpearChargeTicks: 0,
      lastBattleaxeChargeTicks: 0,
      lastCrossbowLoadTicks: 0,
      lastCraftTicks: 0,
      lastAttackWindupTicks: 0,
      thrownBattleaxeItemID: 0,
      lastAttackCooldown: 0,
      currentActionElapsedTicks: 0,
      currentActionDurationTicks: 0,
      currentActionPauseTicksRemaining: 0,
      currentActionRate: 0,
      currentActionStartLimbState: createZeroedLimbState(),
      currentActionEndLimbState: createZeroedLimbState(),
      swingAttack: 0,
      blockAttack: 0,
      animationStartOffset: new Point(-1, -1),
      animationEndOffset: new Point(-1, -1),
      animationDurationTicks: 0,
      animationTicksElapsed: 0,
      torchLight: null,
      lastBlockTick: 0,
      blockPositionX: 0,
      blockPositionY: 0,
      blockType: 0
   };
}

const readLimbStateFromPacket = (reader: PacketReader): LimbState => {
   const direction = reader.readNumber();
   const extraOffset = reader.readNumber();
   const rotation = reader.readNumber();
   const extraOffsetX = reader.readNumber();
   const extraOffsetY = reader.readNumber();

   return {
      direction: direction,
      extraOffset: extraOffset,
      angle: rotation,
      extraOffsetX: extraOffsetX,
      extraOffsetY: extraOffsetY
   };
}

const updateLimbStateFromPacket = (reader: PacketReader, limbState: LimbState): void => {
   limbState.direction = reader.readNumber();
   limbState.extraOffset = reader.readNumber();
   limbState.angle = reader.readNumber();
   limbState.extraOffsetX = reader.readNumber();
   limbState.extraOffsetY = reader.readNumber();
}

const resetThing = (thing: RenderPart): void => {
   thing.offset.x = 0;
   thing.offset.y = 0;
   thing.angle = 0;
}

const setThingToState = (humanoidRadius: number, thing: RenderPart, state: LimbState): void => {
   const direction = state.direction;
   const offset = humanoidRadius + state.extraOffset;

   thing.offset.x = offset * Math.sin(direction) + state.extraOffsetX;
   thing.offset.y = offset * Math.cos(direction) + state.extraOffsetY;
   thing.angle = state.angle;
}

const lerpThingBetweenStates = (entity: Entity, thing: RenderPart, startState: LimbState, endState: LimbState, progress: number): void => {
   if (progress > 1) {
      progress = 1;
   }
   
   const direction = lerp(startState.direction, endState.direction, progress);
   const extraOffset = lerp(startState.extraOffset, endState.extraOffset, progress);
   const offset = getHumanoidRadius(entity) + extraOffset;
   
   thing.offset.x = offset * Math.sin(direction) + lerp(startState.extraOffsetX, endState.extraOffsetX, progress);
   thing.offset.y = offset * Math.cos(direction) + lerp(startState.extraOffsetY, endState.extraOffsetY, progress);
   // @Incomplete? Hand mult
   thing.angle = lerp(startState.angle, endState.angle, progress);
   // limb.rotation = attackHandRotation * handMult;
}

const removeHeldItemRenderPart = (inventoryUseComponent: InventoryUseComponent, entity: Entity, limbIdx: number): void => {
   if (inventoryUseComponent.activeItemRenderParts.hasOwnProperty(limbIdx)) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(inventoryUseComponent.activeItemRenderParts[limbIdx]);
      delete inventoryUseComponent.activeItemRenderParts[limbIdx];
   }
}

const updateHeldItemRenderPart = (inventoryUseComponent: InventoryUseComponent, entity: Entity, limbIdx: number, heldItemType: ItemType | null, offsetX: number, offsetY: number, rotation: number, showLargeTexture: boolean): void => {
   if (heldItemType === null) {
      removeHeldItemRenderPart(inventoryUseComponent, entity, limbIdx);
      return;
   }
   
   // Create held item render part if missing
   if (!inventoryUseComponent.activeItemRenderParts.hasOwnProperty(limbIdx)) {
      const renderPart = new TexturedRenderPart(
         inventoryUseComponent.limbAttachPoints[limbIdx],
         limbIdx === 0 ? 1.15 : 1.1,
         0,
         getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[heldItemType].entityTextureSource)
      );

      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.attachRenderPart(renderPart);
      inventoryUseComponent.activeItemRenderParts[limbIdx] = renderPart;
   }

   const heldItemRenderPart = inventoryUseComponent.activeItemRenderParts[limbIdx];

   heldItemRenderPart.offset.x = offsetX;
   heldItemRenderPart.offset.y = offsetY;
   heldItemRenderPart.angle = rotation;
   
   // Render part texture
   const clientItemInfo = CLIENT_ITEM_INFO_RECORD[heldItemType];
   const textureSource = showLargeTexture ? clientItemInfo.toolTextureSource : clientItemInfo.entityTextureSource;
   heldItemRenderPart.switchTextureSource(textureSource);
}

const updateHeldItemRenderPartForAttack = (inventoryUseComponent: InventoryUseComponent, entity: Entity, limbIdx: number, heldItemType: ItemType | null): void => {
   if (heldItemType === null) {
      removeHeldItemRenderPart(inventoryUseComponent, entity, limbIdx);
      return;
   }
   
   let offsetX: number;
   let offsetY: number;
   let rotation: number;
   let showLargeTexture: boolean;

   // @HACK
   if (heldItemType === ItemType.ivoryTusk) {
      offsetX = 12;
      offsetY = 24;
      rotation = 0;
      showLargeTexture = true;
   } else {
   // @Shit
   switch (ITEM_TYPE_RECORD[heldItemType]) {
      case "shield": {
         offsetX = 8;
         offsetY = 10;
         rotation = Math.PI * 0.25;
         showLargeTexture = true;
         break;
      }
      case "pickaxe": {
         offsetX = 20;
         offsetY = 24;
         rotation = 0;
         showLargeTexture = true;
         break;
      }
      case "bow": {
         offsetX = -8;
         offsetY = 4;
         rotation = Math.PI * 0.15;
         showLargeTexture = true;
         break;
      }
      case "sword":
      case "hammer":
      case "axe": {
         offsetX = 24;
         offsetY = 24;
         rotation = 0;
         showLargeTexture = true;
         break;
      }
      case "animalStaff": {
         offsetX = 26;
         offsetY = 24;
         rotation = 0;
         showLargeTexture = true;
         break;
      }
      case "spear": {
         offsetX = 4;
         offsetY = 20;
         rotation = 0;
         showLargeTexture = true;
         break;
      }
      default: {
         offsetX = 8;
         offsetY = 8;
         rotation = 0;
         showLargeTexture = false;
         break;
      }
   }
   }

   updateHeldItemRenderPart(inventoryUseComponent, entity, limbIdx, heldItemType, offsetX, offsetY, rotation, showLargeTexture);
}

const removeArrowRenderPart = (inventoryUseComponent: InventoryUseComponent, entity: Entity, limbIdx: number): void => {
    if (inventoryUseComponent.arrowRenderParts.hasOwnProperty(limbIdx)) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(inventoryUseComponent.arrowRenderParts[limbIdx]);
      delete inventoryUseComponent.arrowRenderParts[limbIdx];
   }
}

export function readCrossbowLoadProgressRecord(reader: PacketReader): Partial<Record<number, number>> {
   const record: Partial<Record<number, number>> = {};

   const numEntries = reader.readNumber();
   for (let i = 0; i < numEntries; i++) {
      const itemSlot = reader.readNumber();
      const cooldown = reader.readNumber();
      record[itemSlot] = cooldown;
   }

   return record;
}

export function inventoryUseComponentHasLimbInfo(inventoryUseComponent: InventoryUseComponent, inventoryName: InventoryName): boolean {
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const useInfo = inventoryUseComponent.limbInfos[i];
      if (useInfo.inventoryName === inventoryName) {
         return true;
      }
   }

   return false;
}

export function getLimbByInventoryName(inventoryUseComponent: InventoryUseComponent, inventoryName: InventoryName): LimbInfo {
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const useInfo = inventoryUseComponent.limbInfos[i];
      if (useInfo.inventoryName === inventoryName) {
         return useInfo;
      }
   }

   throw new Error("No inventory by name " + inventoryName + ".");
}

export function getLimbConfiguration(inventoryUseComponent: InventoryUseComponent): LimbConfiguration {
   // @HACK cuz there's a weird hack where it thinks enemy players have 1 limb??
   return LimbConfiguration.twoHanded;
   
   
   // switch (inventoryUseComponent.limbInfos.length) {
   //    case 1: return LimbConfiguration.singleHanded;
   //    case 2: return LimbConfiguration.twoHanded;
   //    default: throw new Error();
   // }
}

export const InventoryUseComponentArray = new ServerComponentArray<InventoryUseComponent, InventoryUseComponentData, never>(ServerComponentType.inventoryUse, true, createComponent, getMaxRenderParts, decodeData);
InventoryUseComponentArray.onLoad = onLoad;
InventoryUseComponentArray.onTick = onTick;
InventoryUseComponentArray.updateFromData = updateFromData;
InventoryUseComponentArray.updatePlayerFromData = updatePlayerFromData;

function decodeData(reader: PacketReader): InventoryUseComponentData {
   const limbInfos = new Array<LimbInfo>();

   const numUseInfos = reader.readNumber();
   for (let i = 0; i < numUseInfos; i++) {
      const usedInventoryName = reader.readNumber() as InventoryName;

      const limbInfo = createZeroedLimbInfo(usedInventoryName);
      limbInfos.push(limbInfo);

      updateLimbInfoFromData(limbInfo, reader);
   }

   return {
      limbInfos: limbInfos
   };
}

function createComponent(entityComponentData: EntityComponentData): InventoryUseComponent {
   return {
      limbInfos: entityComponentData.serverComponentData[ServerComponentType.inventoryUse]!.limbInfos,
      limbAttachPoints: [],
      limbRenderParts: [],
      activeItemRenderParts: [],
      inactiveCrossbowArrowRenderParts: {},
      arrowRenderParts: {},
      customItemRenderPart: null,
      bandageRenderParts: []
   };
}

function getMaxRenderParts(entityComponentData: EntityComponentData): number {
   // Each limb can hold an active item render part
   const inventoryUseComponentData = entityComponentData.serverComponentData[ServerComponentType.inventoryUse]!;
   // (@Hack: plus one arrow render part)
   return inventoryUseComponentData.limbInfos.length + 1;
}

function onLoad(entity: Entity): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   const renderInfo = getEntityRenderInfo(entity);

   const numExpectedLimbs = inventoryUseComponent.limbInfos.length;
   
   const attachPoints = renderInfo.getRenderThings("inventoryUseComponent:attachPoint", numExpectedLimbs) as Array<RenderAttachPoint>;
   for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
      inventoryUseComponent.limbAttachPoints.push(attachPoints[limbIdx]);
   }
   
   // @Cleanup
   const handRenderParts = renderInfo.getRenderThings("inventoryUseComponent:hand", numExpectedLimbs) as Array<VisualRenderPart>;
   for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
      inventoryUseComponent.limbRenderParts.push(handRenderParts[limbIdx]);
   }

   for (let i = 0; i < numExpectedLimbs; i++) {
      updateLimb(inventoryUseComponent, entity, i, inventoryUseComponent.limbInfos[i]);
   }

   updateCustomItemRenderPart(entity);
}

function onTick(entity: Entity): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   // @Cleanup: move to separate function
   for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
      const limbInfo = inventoryUseComponent.limbInfos[limbIdx];
      if (limbInfo.heldItemType === null) {
         continue;
      }

      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      const velocity = getHitboxVelocity(hitbox);

      switch (limbInfo.heldItemType) {
         case ItemType.deepfrost_heart: {
            // Make the deep frost heart item spew blue blood particles
            const activeItemRenderPart = inventoryUseComponent.activeItemRenderParts[limbIdx];
            createDeepFrostHeartBloodParticles(activeItemRenderPart.renderPosition.x, activeItemRenderPart.renderPosition.y, velocity.x, velocity.y);
            break;
         }
         case ItemType.fireTorch: {
            const activeItemRenderPart = inventoryUseComponent.activeItemRenderParts[limbIdx];
            // @Hack: shouldn't happen in the first place
            if (typeof activeItemRenderPart === "undefined") {
               break;
            }
            
            // Ember particles
            if (tickIntervalHasPassed(0.08)) {
               const renderPosition = getRenderPartRenderPosition(activeItemRenderPart);
               let spawnPositionX = renderPosition.x;
               let spawnPositionY = renderPosition.y;
      
               const spawnOffsetMagnitude = 7 * Math.random();
               const spawnOffsetDirection = randAngle();
               spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
               spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
      
               const vx = velocity.x;
               const vy = velocity.y;
               createEmberParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 120), vx, vy);
            }

            // Smoke particles
            if (tickIntervalHasPassed(0.18)) {
               const renderPosition = getRenderPartRenderPosition(activeItemRenderPart);

               const spawnOffsetMagnitude = 5 * Math.random();
               const spawnOffsetDirection = randAngle();
               const spawnPositionX = renderPosition.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
               const spawnPositionY = renderPosition.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
               createSmokeParticle(spawnPositionX, spawnPositionY, 24);
            }

            break;
         }
         case ItemType.slurbTorch: {
            const activeItemRenderPart = inventoryUseComponent.activeItemRenderParts[limbIdx];
            // @Hack: shouldn't happen in the first place
            if (typeof activeItemRenderPart === "undefined") {
               break;
            }

            if (tickIntervalHasPassed(0.4)) {
               const renderPosition = getRenderPartRenderPosition(activeItemRenderPart);
               let spawnPositionX = renderPosition.x;
               let spawnPositionY = renderPosition.y;

               const spawnOffsetMagnitude = 7 * Math.random();
               const spawnOffsetDirection = randAngle();
               spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
               spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

               createSlurbParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 120), 0, 0);
            }
         }
      }

      // @Incomplete: If eating multiple foods at once, shouldn't be on the same tick interval
      if (tickIntervalHasPassed(0.25) && limbInfo.action === LimbAction.eat && ITEM_TYPE_RECORD[limbInfo.heldItemType] === "healing") {
         // Create food eating particles
         for (let i = 0; i < 3; i++) {
            let spawnPositionX = hitbox.box.position.x + 37 * Math.sin(hitbox.box.angle);
            let spawnPositionY = hitbox.box.position.y + 37 * Math.cos(hitbox.box.angle);

            const spawnOffsetMagnitude = randFloat(0, 6);
            const spawnOffsetDirection = randAngle();
            spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            let velocityMagnitude = randFloat(130, 170);
            const velocityDirection = randAngle();
            const velocityX = velocityMagnitude * Math.sin(velocityDirection) + velocity.x;
            const velocityY = velocityMagnitude * Math.cos(velocityDirection) + velocity.y;
            velocityMagnitude += velocity.magnitude();
            
            const lifetime = randFloat(0.3, 0.4);

            const particle = new Particle(lifetime);
            particle.getOpacity = () => {
               return 1 - Math.pow(particle.age / lifetime, 3);
            }

            const colour = randItem(FOOD_EATING_COLOURS[limbInfo.heldItemType as keyof typeof FOOD_EATING_COLOURS]);

            // @Cleanup @Incomplete: move to particles file
            addMonocolourParticleToBufferContainer(
               particle,
               ParticleRenderLayer.low,
               6, 6,
               spawnPositionX, spawnPositionY,
               velocityX, velocityY,
               0, 0,
               velocityMagnitude / lifetime / 1.3,
               randAngle(),
               0,
               0,
               0,
               colour[0], colour[1], colour[2]
            );
            Board.lowMonocolourParticles.push(particle);
         }
      }
   }

   for (let i = 0; i < inventoryUseComponent.bandageRenderParts.length; i++) {
      const renderPart = inventoryUseComponent.bandageRenderParts[i];
      updateBandageRenderPart(entity, renderPart);
   }

   updateCustomItemRenderPart(entity);
}

// @Cleanup: unused
// const updateActiveItemRenderPart = (inventoryUseComponent: InventoryUseComponent, limbIdx: number, limbInfo: LimbInfo, activeItem: Item | null): void => {
//    if (activeItem === null) {
//       if (inventoryUseComponent.activeItemRenderParts.hasOwnProperty(limbIdx)) {
//          inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.activeItemRenderParts[limbIdx]);
//          delete inventoryUseComponent.activeItemRenderParts[limbIdx];
//       }

//       if (inventoryUseComponent.inactiveCrossbowArrowRenderParts.hasOwnProperty(limbIdx)) {
//          inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.inactiveCrossbowArrowRenderParts[limbIdx]);
//          delete inventoryUseComponent.inactiveCrossbowArrowRenderParts[limbIdx];
//       }

//       if (inventoryUseComponent.arrowRenderParts.hasOwnProperty(limbIdx)) {
//          inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.arrowRenderParts[limbIdx]);
//          delete inventoryUseComponent.arrowRenderParts[limbIdx];
//       }
//    } else {
//       if (!inventoryUseComponent.activeItemRenderParts.hasOwnProperty(limbIdx)) {
//          const renderPart = new TexturedRenderPart(
//             inventoryUseComponent.limbAttachPoints[limbIdx],
//             limbIdx === 0 ? 1.15 : 1.1,
//             0,
//             activeItem !== null ? getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItem.type].entityTextureSource) : -1
//          );
//          inventoryUseComponent.entity.attachRenderThing(renderPart);
//          inventoryUseComponent.activeItemRenderParts[limbIdx] = renderPart;
//       }

//       const activeItemRenderPart = inventoryUseComponent.activeItemRenderParts[limbIdx];
//       activeItemRenderPart.flipX = limbIdx === 1;
      
//       const itemInfo = ITEM_INFO_RECORD[activeItem.type];
//       if (itemInfoIsUtility(activeItem.type, itemInfo)) {
//          // @Hack: only works for player
//          // Change the bow charging texture based on the charge progress
//          if ((limbInfo.action === LimbAction.chargeBow || limbInfo.action === LimbAction.loadCrossbow || typeof definiteGameState.hotbarCrossbowLoadProgressRecord[limbInfo.selectedItemSlot] !== "undefined") && itemInfoIsBow(activeItem.type, itemInfo)) {
//             const lastActionTicks = limbInfo.action === LimbAction.chargeBow ? limbInfo.lastBowChargeTicks : limbInfo.lastCrossbowLoadTicks;
//             const secondsSinceLastAction = getSecondsSinceTickTimestamp(lastActionTicks);
//             // @Hack: why does itemInfoIsBow not narrow this fully??
//             const chargeProgress = secondsSinceLastAction / (itemInfo as BowItemInfo).shotCooldownTicks * Settings.TICK_RATE;

//             let textureSourceArray: ReadonlyArray<string>;
//             let arrowTextureSource: string;
//             switch (activeItem.type) {
//                case ItemType.wooden_bow: {
//                   textureSourceArray = BOW_CHARGE_TEXTURE_SOURCES;
//                   arrowTextureSource = "projectiles/wooden-arrow.png";
//                   break;
//                }
//                case ItemType.reinforced_bow: {
//                   textureSourceArray = REINFORCED_BOW_CHARGE_TEXTURE_SOURCES;
//                   arrowTextureSource = "projectiles/wooden-arrow.png";
//                   break;
//                }
//                case ItemType.ice_bow: {
//                   textureSourceArray = ICE_BOW_CHARGE_TEXTURE_SOURCES;
//                   arrowTextureSource = "projectiles/ice-arrow.png";
//                   break;
//                }
//                case ItemType.crossbow: {
//                   textureSourceArray = CROSSBOW_CHARGE_TEXTURE_SOURCES;
//                   arrowTextureSource = "projectiles/wooden-arrow.png";
//                   break;
//                }
//                default: {
//                   const tribesmanComponent = inventoryUseComponent.entity.getServerComponentA(ServerComponentType.tribesmanAI);
//                   console.log(tribesmanComponent.aiType);
//                   console.log(limbIdx);
//                   console.log(activeItem);
//                   throw new Error("Not bow");
//                }
//             }

//             if (!inventoryUseComponent.arrowRenderParts.hasOwnProperty(limbIdx)) {
//                inventoryUseComponent.arrowRenderParts[limbIdx] = new TexturedRenderPart(
//                   inventoryUseComponent.activeItemRenderParts[limbIdx],
//                   inventoryUseComponent.activeItemRenderParts[limbIdx].zIndex + 0.1,
//                   Math.PI/4,
//                   getTextureArrayIndex(arrowTextureSource)
//                );
//                inventoryUseComponent.entity.attachRenderThing(inventoryUseComponent.arrowRenderParts[limbIdx]);
//             }

//             let textureIdx = Math.floor(chargeProgress * textureSourceArray.length);
//             if (textureIdx >= textureSourceArray.length) {
//                textureIdx = textureSourceArray.length - 1;
//             }
//             inventoryUseComponent.activeItemRenderParts[limbIdx].switchTextureSource(textureSourceArray[textureIdx]);
//          } else if (inventoryUseComponent.arrowRenderParts.hasOwnProperty(limbIdx)) {
//             inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.arrowRenderParts[limbIdx]);
//             delete inventoryUseComponent.arrowRenderParts[limbIdx];
//          }

//          // if (useInfo.currentAction === LimbAction.none && )
//          // @Incomplete: Only works for player
//          // @Incomplete
//          // if (limbIdx === 0 && this.rightAction === LimbAction.none && activeItem.type === ItemType.crossbow && definiteGameState.hotbarCrossbowLoadProgressRecord.hasOwnProperty(latencyGameState.selectedHotbarItemSlot) && definiteGameState.hotbarCrossbowLoadProgressRecord[latencyGameState.selectedHotbarItemSlot] === 1) {
//          //    renderPart.switchTextureSource("miscellaneous/crossbow-charge-5.png");

//          //    if (this.inactiveCrossbowArrowRenderPart === null) {
//          //       const arrowTextureSource = "projectiles/wooden-arrow.png";

//          //       this.inactiveCrossbowArrowRenderPart = new RenderPart(
//          //          this.activeItemRenderParts[0],
//          //          getTextureArrayIndex(arrowTextureSource),
//          //          this.activeItemRenderParts[0].zIndex + 0.1,
//          //          Math.PI/4
//          //       );
//          //       this.attachRenderPart(this.inactiveCrossbowArrowRenderPart);
//          //    }
//          // } else {
//             activeItemRenderPart.switchTextureSource(CLIENT_ITEM_INFO_RECORD[activeItem.type].toolTextureSource);
         
//          if (inventoryUseComponent.inactiveCrossbowArrowRenderParts.hasOwnProperty(limbIdx)) {
//             inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.inactiveCrossbowArrowRenderParts[limbIdx]);
//             delete inventoryUseComponent.inactiveCrossbowArrowRenderParts[limbIdx];
//          }
//          // }
//       } else {
//          activeItemRenderPart.switchTextureSource(CLIENT_ITEM_INFO_RECORD[activeItem.type].entityTextureSource);
//       }
//    }
// }

const updateLimbTorch = (limb: LimbInfo, heldItemRenderPart: RenderPart, entity: Entity, heldItemType: ItemType | null): void => {
   // @Cleanup: this is all garbaaarge. lots o copy and paste. Should instead just attach item entity to limb??
   
   
   
   // If selecting an item with a torch trait, create a light
   // @Hack: The check for undefined
   if (heldItemType !== null && typeof heldItemRenderPart !== "undefined") {
      let hasLight: boolean;
      let lightIntensity!: number;
      let lightStrength!: number;
      let lightRadius!: number;
      let lightR!: number;
      let lightG!: number;
      let lightB!: number;
      switch (heldItemType) {
         case ItemType.slurb: {
            hasLight = true;
            lightIntensity = 0.6;
            lightStrength = 0.5;
            lightRadius = 4;
            lightR = 1;
            lightG = 0.1;
            lightB = 1;
            break;
         }
         case ItemType.slurbTorch: {
            hasLight = true;
            lightIntensity = 0.8;
            lightStrength = 2;
            lightRadius = 10;
            lightR = 1;
            lightG = 0.4;
            lightB = 1;
            break;
         }
         case ItemType.fireTorch: {
            hasLight = true;
            lightIntensity = 1;
            lightStrength = 2;
            lightRadius = 10;
            lightR = 1;
            lightG = 0.6;
            lightB = 0.35;
            break;
         }
         default: {
            hasLight = false;
         }
      }
      
      if (hasLight) {
         if (limb.torchLight === null) {
            // @INCOMPLETE
            // limb.torchLight = createLight(new Point(0, 0), lightIntensity, lightStrength, lightRadius, lightR, lightG, lightB);
            // attachLightToRenderPart(limb.torchLight, heldItemRenderPart, entity);
         } else {
            limb.torchLight.intensity = lightIntensity;
            limb.torchLight.strength = lightStrength;
            limb.torchLight.radius = lightRadius;
            limb.torchLight.r = lightR;
            limb.torchLight.g = lightG;
            limb.torchLight.b = lightB;
         }

         if (tickIntervalHasPassed(0.15) && heldItemType === ItemType.fireTorch) {
            // limb.torchLight.radius = lightRadius + randFloat(-7, 7);
         }
         
         return;
      }
   }

   if (limb.torchLight !== null) {
      removeLight(limb.torchLight);
      limb.torchLight = null;
   }
}

// @Temporary @Hack
export function updateLimb_TEMP(limbRenderPart: RenderPart, attachPoint: RenderAttachPoint, humanoidRadius: number, limbConfiguration: LimbConfiguration): void {
   setThingToState(humanoidRadius, attachPoint, RESTING_LIMB_STATES[limbConfiguration]);
   resetThing(limbRenderPart);
}

const updateLimb = (inventoryUseComponent: InventoryUseComponent, entity: Entity, limbIdx: number, limb: LimbInfo): void => {
   // @Bug: The itemSize variable will be one tick too slow as it gets the size of the item before it has been updated
   
   const limbRenderPart = inventoryUseComponent.limbRenderParts[limbIdx];
   const attachPoint = inventoryUseComponent.limbAttachPoints[limbIdx];
   
   attachPoint.shakeAmount = 0;

   const heldItemType = limb.heldItemType;
   const itemSize = heldItemType !== null && itemInfoIsTool(heldItemType, ITEM_INFO_RECORD[heldItemType]) ? 8 * 4 : 4 * 4;
   
   const heldItemRenderPart = inventoryUseComponent.activeItemRenderParts[limbIdx];
   updateLimbTorch(limb, heldItemRenderPart, entity, heldItemType);
   
   // @Hack
   // updateActiveItemRenderPart(inventoryUseComponent, limbIdx, limbInfo, null);
   
   // @Hack @Incomplete
   // Zombie lunge attack
   // if (inventoryUseComponent.entity.type === EntityType.zombie && heldItemType !== null) {
   //    const secondsSinceLastAction = getSecondsSinceTickTimestamp(limb.lastAttackTicks);
      
   //    let attackProgress = secondsSinceLastAction / ATTACK_LUNGE_TIME;
   //    if (attackProgress > 1) {
   //       attackProgress = 1;
   //    }

   //    const direction = lerp(Math.PI / 7, ZOMBIE_HAND_RESTING_DIRECTION, attackProgress) * limbMult;
   //    const offset = lerp(42, ZOMBIE_HAND_RESTING_OFFSET, attackProgress);
      
   //    limbRenderPart.offset.x = offset * Math.sin(direction);
   //    limbRenderPart.offset.y = offset * Math.cos(direction);
   //    limbRenderPart.rotation = lerp(-Math.PI/8, ZOMBIE_HAND_RESTING_ROTATION, attackProgress) * limbMult;
   //    return;
   // }

   const limbConfiguration = getLimbConfiguration(inventoryUseComponent);

   switch (limb.action) {
      // case LimbAction.chargeBow: {
      //    // @Hack
      //    const isDominantHand = limbIdx === 0;

      //    resetThing(attachPoint);
      //    if (isDominantHand) {
      //       // @Copynpaste
      //       const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
      //       const chargeProgress = secondsSinceLastAction * Settings.TICK_RATE / limb.currentActionDurationTicks;
      //       lerpThingBetweenStates(entity, limbRenderPart, BOW_CHARGE_DOMINANT_START_LIMB_STATE, BOW_CHARGE_DOMINANT_END_LIMB_STATE, chargeProgress);
      //       updateHeldItemRenderPart(inventoryUseComponent, entity, limbIdx, heldItemType, 0, 58, Math.PI * -0.25, true);
            
      //       // @Cleanup @Hack @Robustness
      //       let textureSourceArray: ReadonlyArray<string>;
      //       let arrowTextureSource: string;
      //       switch (heldItemType) {
      //          case ItemType.wooden_bow: {
      //             textureSourceArray = BOW_CHARGE_TEXTURE_SOURCES;
      //             arrowTextureSource = "projectiles/wooden-arrow.png";
      //             break;
      //          }
      //          case ItemType.reinforced_bow: {
      //             textureSourceArray = REINFORCED_BOW_CHARGE_TEXTURE_SOURCES;
      //             arrowTextureSource = "projectiles/wooden-arrow.png";
      //             break;
      //          }
      //          case ItemType.ice_bow: {
      //             textureSourceArray = ICE_BOW_CHARGE_TEXTURE_SOURCES;
      //             arrowTextureSource = "projectiles/ice-arrow.png";
      //             break;
      //          }
      //          case ItemType.crossbow: {
      //             textureSourceArray = CROSSBOW_CHARGE_TEXTURE_SOURCES;
      //             arrowTextureSource = "projectiles/wooden-arrow.png";
      //             break;
      //          }
      //          default: {
      //             const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity);
      //             console.log(tribesmanComponent.aiType);
      //             console.log(limbIdx);
      //             console.log(heldItemType);
      //             throw new Error("Not bow");
      //          }
      //       }

      //       if (!inventoryUseComponent.arrowRenderParts.hasOwnProperty(limbIdx)) {
      //          inventoryUseComponent.arrowRenderParts[limbIdx] = new TexturedRenderPart(
      //             inventoryUseComponent.activeItemRenderParts[limbIdx],
      //             inventoryUseComponent.activeItemRenderParts[limbIdx].zIndex + 0.1,
      //             Math.PI/4,
      //             getTextureArrayIndex(arrowTextureSource)
      //          );

      //          const renderInfo = getEntityRenderInfo(entity);
      //          renderInfo.attachRenderPart(inventoryUseComponent.arrowRenderParts[limbIdx]);
      //       }

      //       const pullbackOffset = lerp(10, -8, Math.min(chargeProgress, 1));
      //       inventoryUseComponent.arrowRenderParts[limbIdx].offset.x = pullbackOffset;
      //       inventoryUseComponent.arrowRenderParts[limbIdx].offset.y = pullbackOffset;

      //       let textureIdx = Math.floor(chargeProgress * textureSourceArray.length);
      //       if (textureIdx >= textureSourceArray.length) {
      //          textureIdx = textureSourceArray.length - 1;
      //       }
      //       inventoryUseComponent.activeItemRenderParts[limbIdx].switchTextureSource(textureSourceArray[textureIdx]);
      //    } else {
      //       setThingToState(getHumanoidRadius(entity), limbRenderPart, BOW_CHARGE_NON_DOMINANT_LIMB_STATE);
      //       removeHeldItemRenderPart(inventoryUseComponent, entity, limbIdx);
      //       removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
      //    }
      //    break;
      // }
      case LimbAction.feignAttack: {
         // @Copynpaste
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const windupProgress = secondsSinceLastAction * Settings.TICK_RATE / limb.currentActionDurationTicks;

         lerpThingBetweenStates(entity, attachPoint, limb.currentActionStartLimbState, limb.currentActionEndLimbState, windupProgress);
         resetThing(limbRenderPart);
         updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
         removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
         break;
      }
      case LimbAction.windShieldBash: {
         // @Copynpaste
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const windupProgress = secondsSinceLastAction * Settings.TICK_RATE / limb.currentActionDurationTicks;
         
         lerpThingBetweenStates(entity, attachPoint, SHIELD_BLOCKING_LIMB_STATE, SHIELD_BASH_WIND_UP_LIMB_STATE, windupProgress);
         resetThing(limbRenderPart);
         updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
         removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
         break;
      }
      case LimbAction.pushShieldBash: {
         // @Copynpaste
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const windupProgress = secondsSinceLastAction * Settings.TICK_RATE / limb.currentActionDurationTicks;
         
         lerpThingBetweenStates(entity, attachPoint, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BASH_PUSHED_LIMB_STATE, windupProgress);
         resetThing(limbRenderPart);
         updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
         removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
         break;
      }
      case LimbAction.returnShieldBashToRest: {
         // @Copynpaste
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const windupProgress = secondsSinceLastAction * Settings.TICK_RATE / limb.currentActionDurationTicks;
         
         lerpThingBetweenStates(entity, attachPoint, SHIELD_BASH_PUSHED_LIMB_STATE, SHIELD_BLOCKING_LIMB_STATE, windupProgress);
         resetThing(limbRenderPart);
         updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
         removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
         break;
      }
      case LimbAction.windAttack: {
         // @Copynpaste
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const windupProgress = secondsSinceLastAction * Settings.TICK_RATE / limb.currentActionDurationTicks;

         lerpThingBetweenStates(entity, attachPoint, limb.currentActionStartLimbState, limb.currentActionEndLimbState, windupProgress);
         resetThing(limbRenderPart);
         updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
         removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
         break;
      }
      case LimbAction.attack: {
         // @Copynpaste
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const attackProgress = secondsSinceLastAction * Settings.TICK_RATE / limb.currentActionDurationTicks;

         lerpThingBetweenStates(entity, attachPoint, limb.currentActionStartLimbState, limb.currentActionEndLimbState, attackProgress);
         resetThing(limbRenderPart);
         updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
         removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
         break;
      }
      case LimbAction.returnAttackToRest: {
         // @Copynpaste
         const secondsIntoAnimation = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const animationProgress = secondsIntoAnimation * Settings.TICK_RATE / limb.currentActionDurationTicks;

         lerpThingBetweenStates(entity, attachPoint, limb.currentActionStartLimbState, limb.currentActionEndLimbState, animationProgress);
         resetThing(limbRenderPart);
         updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
         removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
         break;
      }
      case LimbAction.none: {
         setThingToState(getHumanoidRadius(entity), attachPoint, RESTING_LIMB_STATES[limbConfiguration]);
         resetThing(limbRenderPart);
         updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
         removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
         break;
      }
      case LimbAction.chargeSpear: {
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const chargeProgress = secondsSinceLastAction < 3 ? 1 - Math.pow(secondsSinceLastAction / 3 - 1, 2) : 1;

         lerpThingBetweenStates(entity, attachPoint, RESTING_LIMB_STATES[limbConfiguration], SPEAR_CHARGED_LIMB_STATE, chargeProgress);
         resetThing(limbRenderPart);
         updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
         removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);

         attachPoint.shakeAmount = chargeProgress * 1.5;
         break;
      }
      case LimbAction.engageBlock:
      case LimbAction.block:
      case LimbAction.returnBlockToRest:
      case LimbAction.engageBow:
      case LimbAction.moveLimbToQuiver:
      case LimbAction.moveLimbFromQuiver:
      case LimbAction.chargeBow:
      case LimbAction.pullBackArrow:
      case LimbAction.arrowReleased:
      case LimbAction.mainArrowReleased:
      case LimbAction.returnFromBow: {
         const secondsSinceLastAction = getElapsedTimeInSeconds(limb.currentActionElapsedTicks);
         const progress = secondsSinceLastAction * Settings.TICK_RATE / limb.currentActionDurationTicks;

         lerpThingBetweenStates(entity, attachPoint, limb.currentActionStartLimbState, limb.currentActionEndLimbState, progress);
         resetThing(limbRenderPart);
         updateHeldItemRenderPartForAttack(inventoryUseComponent, entity, limbIdx, heldItemType);
         
         // @Hack
         if (limb.action === LimbAction.engageBow) {
            removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
         }

         if (limb.action === LimbAction.moveLimbFromQuiver) {
            // @Cleanup @Hack @Robustness
            let arrowTextureSource: string;
            // @Hack @Incomplete
            arrowTextureSource = "projectiles/wooden-arrow.png";
            // switch (heldItemType) {
            //    case ItemType.wooden_bow: {
            //       textureSourceArray = BOW_CHARGE_TEXTURE_SOURCES;
            //       arrowTextureSource = "projectiles/wooden-arrow.png";
            //       break;
            //    }
            //    case ItemType.reinforced_bow: {
            //       textureSourceArray = REINFORCED_BOW_CHARGE_TEXTURE_SOURCES;
            //       arrowTextureSource = "projectiles/wooden-arrow.png";
            //       break;
            //    }
            //    case ItemType.ice_bow: {
            //       textureSourceArray = ICE_BOW_CHARGE_TEXTURE_SOURCES;
            //       arrowTextureSource = "projectiles/ice-arrow.png";
            //       break;
            //    }
            //    case ItemType.crossbow: {
            //       textureSourceArray = CROSSBOW_CHARGE_TEXTURE_SOURCES;
            //       arrowTextureSource = "projectiles/wooden-arrow.png";
            //       break;
            //    }
            //    default: {
            //       const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity);
            //       console.log(tribesmanComponent.aiType);
            //       console.log(limbIdx);
            //       console.log(heldItemType);
            //       throw new Error("Not bow");
            //    }
            // }

            if (!inventoryUseComponent.arrowRenderParts.hasOwnProperty(limbIdx)) {
               inventoryUseComponent.arrowRenderParts[limbIdx] = new TexturedRenderPart(
                  attachPoint,
                  attachPoint.zIndex + 0.15,
                  0,
                  getTextureArrayIndex(arrowTextureSource)
               );
               inventoryUseComponent.arrowRenderParts[limbIdx].offset.y = 6;

               const renderInfo = getEntityRenderInfo(entity);
               renderInfo.attachRenderPart(inventoryUseComponent.arrowRenderParts[limbIdx]);
            }
         } else if (limb.action === LimbAction.chargeBow) {
            // @Cleanup @Hack @Robustness
            let textureSourceArray: ReadonlyArray<string>;
            // @Hack @Incomplete
            textureSourceArray = BOW_CHARGE_TEXTURE_SOURCES;

            let textureIdx = Math.floor(progress * textureSourceArray.length);
            if (textureIdx >= textureSourceArray.length) {
               textureIdx = textureSourceArray.length - 1;
            }
            // @HACK
            if (typeof inventoryUseComponent.activeItemRenderParts[limbIdx] !== "undefined") {
               inventoryUseComponent.activeItemRenderParts[limbIdx].switchTextureSource(textureSourceArray[textureIdx]);
            }
         } else if (limb.action === LimbAction.mainArrowReleased) {
            // @Cleanup @Hack @Robustness
            let textureSourceArray: ReadonlyArray<string>;
            // @Hack @Incomplete
            textureSourceArray = BOW_CHARGE_TEXTURE_SOURCES;
            inventoryUseComponent.activeItemRenderParts[limbIdx].switchTextureSource(textureSourceArray[0]);
         } else if (limb.action === LimbAction.arrowReleased) {
            removeArrowRenderPart(inventoryUseComponent, entity, limbIdx);
         }
         break;
      }
      // @Incomplete
      // case LimbAction.chargeBattleaxe:
      // case LimbAction.chargeSpear: {
      //    // 
      //    // Spear charge animation
      //    // 
      //    const lastActionTicks = limb.action === LimbAction.chargeBattleaxe ? limb.lastBattleaxeChargeTicks : limb.lastSpearChargeTicks;
      //    const secondsSinceLastAction = getSecondsSinceTickTimestamp(lastActionTicks);
      //    const chargeProgress = secondsSinceLastAction < 3 ? 1 - Math.pow(secondsSinceLastAction / 3 - 1, 2) : 1;

      //    const handRestingDirection = getLimbRestingDirection(inventoryUseComponent.entity.type as InventoryUseEntityType);
      //    const handDirection = lerp(handRestingDirection, Math.PI / 1.5, chargeProgress) * limbMult;

      //    const handRestingOffset = getHandRestingOffset(inventoryUseComponent.entity.type as InventoryUseEntityType);
      //    limbRenderPart.offset.x = handRestingOffset * Math.sin(handDirection);
      //    limbRenderPart.offset.y = handRestingOffset * Math.cos(handDirection);

      //    if (limb.action === LimbAction.chargeSpear) {
      //       limbRenderPart.rotation = lerp(ITEM_RESTING_ROTATION, Math.PI / 3.5, chargeProgress) * limbMult;
      //       itemRenderPart.offset.x = 5;
      //       itemRenderPart.offset.y = 11;
      //       itemRenderPart.rotation = 0;
      //    } else {
      //       limbRenderPart.rotation = lerp(Math.PI / 4.2, Math.PI / 2.5, chargeProgress) * limbMult;
      //       itemRenderPart.offset.x = 12;
      //       itemRenderPart.offset.y = 36;
      //       itemRenderPart.rotation = -Math.PI/6 * limbMult;
      //    }

      //    // @Incomplete
      //    // if (heldItem !== null && limbInfo.thrownBattleaxeItemID === heldItem.id) {
      //    //    shouldShowActiveItemRenderPart = false;
      //    // }

      //    limbRenderPart.shakeAmount = lerp(0, 1.5, chargeProgress);
      //    break;
      // }
      case LimbAction.craft: {
         animateLimb(limbRenderPart, limb);
         createCraftingAnimationParticles(entity, limbIdx);
         // @Incomplete
         // shouldShowActiveItemRenderPart = false;
         break;
      }
      case LimbAction.useMedicine: {
         animateLimb(limbRenderPart, limb);
         createMedicineAnimationParticles(entity, limbIdx);
         // @Incomplete
         // shouldShowActiveItemRenderPart = false;
         break;
      }
      case LimbAction.researching: {
         animateLimb(limbRenderPart, limb);
         // @Incomplete
         // shouldShowActiveItemRenderPart = false;
         break;
      }
      case LimbAction.eat: {
         if (heldItemType === null) {
            break;
         }
         // 
         // Eating animation
         // 
      
         const secondsSinceLastAction = getSecondsSinceTickTimestamp(limb.lastEatTicks);
         let eatIntervalProgress = (secondsSinceLastAction % FOOD_EAT_INTERVAL) / FOOD_EAT_INTERVAL * 2;
         if (eatIntervalProgress > 1) {
            eatIntervalProgress = 2 - eatIntervalProgress;
         }
         
         let activeItemDirection = Math.PI / 4;
         activeItemDirection -= lerp(0, Math.PI/5, eatIntervalProgress);

         const insetAmount = lerp(0, 17, eatIntervalProgress);
         
         const handRestingOffset = getHumanoidRadius(entity);
         const handOffsetAmount = handRestingOffset + 4 - insetAmount;
         attachPoint.offset.x = handOffsetAmount * Math.sin(activeItemDirection);
         attachPoint.offset.y = handOffsetAmount * Math.cos(activeItemDirection);
         attachPoint.angle = lerp(HAND_RESTING_ROTATION, HAND_RESTING_ROTATION - Math.PI/5, eatIntervalProgress);

         const activeItemOffsetAmount = itemSize/2 - insetAmount;
         const activeItemOffsetDirection = activeItemDirection - Math.PI/14;
         const offsetX = activeItemOffsetAmount * Math.sin(activeItemOffsetDirection);
         const offsetY = activeItemOffsetAmount * Math.cos(activeItemOffsetDirection);
         const rotation = lerp(0, -Math.PI/3, eatIntervalProgress);
         updateHeldItemRenderPart(inventoryUseComponent, entity, limbIdx, heldItemType, offsetX, offsetY, rotation, false);
         break;
      }
      // case LimbAction.none: {
      //    // 
      //    // Attack animation
      //    // 

      //    const secondsSinceLastAction = getSecondsSinceTickTimestamp(limbInfo.lastAttackTicks);
      //    const handRestingDirection = getLimbRestingDirection(inventoryUseComponent.entity.type as InventoryUseEntityType);

      //    // 
      //    // Calculate attack progress
      //    // 
   
      //    let attackProgress = secondsSinceLastAction / limbInfo.lastAttackCooldown;
      //    if (attackProgress > 1) {
      //       attackProgress = 1;
      //    }

      //    // @Cleanup: Copy and paste
      //    if (item !== null && item.type === ItemType.spear) {
      //       let direction: number;
      //       let attackHandRotation: number;
      //       let extraOffset: number;
      //       if (attackProgress < SPEAR_ATTACK_LUNGE_TIME) {
      //          // Lunge part of the animation
      //          direction = lerp(handRestingDirection, Math.PI / 4, attackProgress / SPEAR_ATTACK_LUNGE_TIME);
      //          attackHandRotation = lerp(ITEM_RESTING_ROTATION, -Math.PI / 7, attackProgress / SPEAR_ATTACK_LUNGE_TIME);
      //          extraOffset = lerp(0, 7, attackProgress / SPEAR_ATTACK_LUNGE_TIME);
      //       } else {
      //          // Return part of the animation
      //          const returnProgress = (attackProgress - SPEAR_ATTACK_LUNGE_TIME) / (1 - SPEAR_ATTACK_LUNGE_TIME);
      //          direction = lerp(Math.PI / 4, handRestingDirection, returnProgress);
      //          attackHandRotation = lerp(-Math.PI / 7, ITEM_RESTING_ROTATION, returnProgress);
      //          extraOffset = lerp(7, 0, returnProgress);
      //       }

      //       const handRestingOffset = getHandRestingOffset(inventoryUseComponent.entity.type as InventoryUseEntityType);
      //       const handOffsetDirection = direction * handMult;
      //       const handOffsetAmount = handRestingOffset + extraOffset;
      //       limb.offset.x = handOffsetAmount * Math.sin(handOffsetDirection);
      //       limb.offset.y = handOffsetAmount * Math.cos(handOffsetDirection);
      //       limb.rotation = attackHandRotation * handMult;

      //       itemRenderPart.offset.x = 5;
      //       itemRenderPart.offset.y = 11;
      //       itemRenderPart.rotation = 0;
      //    } else {
      //       let direction: number;
      //       let attackHandRotation: number;
      //       if (attackProgress < ATTACK_LUNGE_TIME) {
      //          // Lunge part of the animation
      //          direction = lerp(handRestingDirection, handRestingDirection - ITEM_SWING_RANGE, attackProgress / ATTACK_LUNGE_TIME);
      //          attackHandRotation = lerp(ITEM_RESTING_ROTATION, ITEM_END_ROTATION, attackProgress / ATTACK_LUNGE_TIME);
      //       } else {
      //          // Return part of the animation
      //          const returnProgress = (attackProgress - ATTACK_LUNGE_TIME) / (1 - ATTACK_LUNGE_TIME);
      //          direction = lerp(handRestingDirection - ITEM_SWING_RANGE, handRestingDirection, returnProgress);
      //          attackHandRotation = lerp(ITEM_END_ROTATION, ITEM_RESTING_ROTATION, returnProgress);
      //       }
            
      //       const handRestingOffset = getHandRestingOffset(inventoryUseComponent.entity.type as InventoryUseEntityType);
      //       const handOffsetDirection = direction * handMult;
      //       limb.offset.x = handRestingOffset * Math.sin(handOffsetDirection);
      //       limb.offset.y = handRestingOffset * Math.cos(handOffsetDirection);
      //       limb.rotation = attackHandRotation * handMult;

      //       if (item !== null && ITEM_TYPE_RECORD[item.type] === "bow") {
      //          itemRenderPart.rotation = 0;
      //          itemRenderPart.offset.x = 4 * handMult;
      //          itemRenderPart.offset.y = 4;
      //       } else if (item !== null && itemInfoIsTool(item.type, ITEM_INFO_RECORD[item.type])) {
      //          itemRenderPart.rotation = 0;
      //          itemRenderPart.offset.x = (itemSize - 8) * handMult;
      //          itemRenderPart.offset.y = itemSize - 8;
      //       } else if (item !== null) {
      //          itemRenderPart.rotation = 0;
      //          itemRenderPart.offset.x = itemSize/2 * handMult;
      //          itemRenderPart.offset.y = itemSize/2;
      //       }
      //    }
      //    break;
      // }
   }

   // updateActiveItemRenderPart(inventoryUseComponent, limbIdx, limbInfo, heldItem, shouldShowActiveItemRenderPart);
}

const playBlockEffects = (x: number, y: number, blockType: BlockType): void => {
   // @HACK @Incomplete removed this cuz cant access the layer in start. aaaaaaaa
   // playSound(blockType === BlockType.shieldBlock ? "shield-block.mp3" : "block.mp3", blockType === BlockType.toolBlock ? 0.8 : 0.5, 1, new Point(x, y), layer);
   
   for (let i = 0; i < 8; i++) {
      const offsetMagnitude = randFloat(0, 18);
      const offsetDirection = randAngle();
      const particleX = x + offsetMagnitude * Math.sin(offsetDirection);
      const particleY = y + offsetMagnitude * Math.cos(offsetDirection);
      createBlockParticle(particleX, particleY, blockType);
   }
}

const updateLimbInfoFromData = (limbInfo: LimbInfo, reader: PacketReader): void => {
   const selectedItemSlot = reader.readNumber();
   const heldItemType = reader.readNumber();

   const spearWindupCooldowns: Partial<Record<number, number>> = {};
   const numSpearWindupCooldowns = reader.readNumber();
   for (let j = 0; j < numSpearWindupCooldowns; j++) {
      const itemSlot = reader.readNumber();
      const cooldown = reader.readNumber();
      spearWindupCooldowns[itemSlot] = cooldown;
   }

   // @Garbage
   const crossbowLoadProgressRecord = readCrossbowLoadProgressRecord(reader);

   const foodEatingTimer = reader.readNumber();
   const action = reader.readNumber();
   const lastAttackTicks = reader.readNumber();
   const lastEatTicks = reader.readNumber();
   const lastBowChargeTicks = reader.readNumber();
   const lastSpearChargeTicks = reader.readNumber();
   const lastBattleaxeChargeTicks = reader.readNumber();
   const lastCrossbowLoadTicks = reader.readNumber();
   const lastCraftTicks = reader.readNumber();
   const thrownBattleaxeItemID = reader.readNumber();
   const lastAttackCooldown = reader.readNumber();
   const currentActionElapsedTicks = reader.readNumber();
   const currentActionDurationTicks = reader.readNumber();
   const currentActionPauseTicksRemaining = reader.readNumber();
   const currentActionRate = reader.readNumber();
   const swingAttack = reader.readNumber();
   const blockAttack = reader.readNumber();
   const lastBlockTick = reader.readNumber();
   const blockPositionX = reader.readNumber();
   const blockPositionY = reader.readNumber();
   const blockType = reader.readNumber();

   updateLimbStateFromPacket(reader, limbInfo.currentActionStartLimbState);
   updateLimbStateFromPacket(reader, limbInfo.currentActionEndLimbState);

   limbInfo.selectedItemSlot = selectedItemSlot;
   limbInfo.heldItemType = heldItemType !== -1 ? heldItemType : null;
   limbInfo.spearWindupCooldowns = spearWindupCooldowns;
   limbInfo.crossbowLoadProgressRecord = crossbowLoadProgressRecord;
   limbInfo.foodEatingTimer = foodEatingTimer;
   limbInfo.action = action;
   limbInfo.lastAttackTicks = lastAttackTicks;
   limbInfo.lastEatTicks = lastEatTicks;
   limbInfo.lastBowChargeTicks = lastBowChargeTicks;
   limbInfo.lastSpearChargeTicks = lastSpearChargeTicks;
   limbInfo.lastBattleaxeChargeTicks = lastBattleaxeChargeTicks;
   limbInfo.lastCrossbowLoadTicks = lastCrossbowLoadTicks;
   limbInfo.lastCraftTicks = lastCraftTicks;
   limbInfo.thrownBattleaxeItemID = thrownBattleaxeItemID;
   limbInfo.lastAttackCooldown = lastAttackCooldown;
   limbInfo.swingAttack = swingAttack;
   limbInfo.blockAttack = blockAttack;
   limbInfo.currentActionElapsedTicks = currentActionElapsedTicks;
   limbInfo.currentActionDurationTicks = currentActionDurationTicks;
   limbInfo.currentActionPauseTicksRemaining = currentActionPauseTicksRemaining;
   limbInfo.currentActionRate = currentActionRate;

   // @Hack
   // Initial animation start position
   if (action === LimbAction.craft || action === LimbAction.researching) {
      if (limbInfo.animationStartOffset.x === -1) {
         const startOffset = generateRandomLimbPosition();
         limbInfo.animationStartOffset.x = startOffset.x;
         limbInfo.animationStartOffset.y = startOffset.y;

         const endOffset = generateRandomLimbPosition();
         limbInfo.animationEndOffset.x = endOffset.x;
         limbInfo.animationEndOffset.y = endOffset.y;
      }
   } else {
      limbInfo.animationStartOffset.x = -1;
   }

   limbInfo.lastBlockTick = lastBlockTick;
   limbInfo.blockPositionX = blockPositionX;
   limbInfo.blockPositionY = blockPositionY;
   limbInfo.blockType = blockType;
}

function updateFromData(data: InventoryUseComponentData, entity: Entity): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   inventoryUseComponent.limbInfos.splice(0, inventoryUseComponent.limbInfos.length);
   for (let i = 0; i < data.limbInfos.length; i++) {
      const limbInfo = data.limbInfos[i];

      inventoryUseComponent.limbInfos.push(limbInfo);
      updateLimb(inventoryUseComponent, entity, i, limbInfo);

      if (limbInfo.lastBlockTick === currentSnapshot.tick) {
         playBlockEffects(limbInfo.blockPositionX, limbInfo.blockPositionY, limbInfo.blockType);
      }
   }
}

// BAGUETTE

function updatePlayerFromData(data: InventoryUseComponentData): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
   
   for (let i = 0; i < data.limbInfos.length; i++) {
      const limbInfoData = data.limbInfos[i];
      const usedInventoryName = limbInfoData.inventoryName;

      let limbInfo: LimbInfo;
      if (i >= inventoryUseComponent.limbInfos.length) {
         // New limb info
         limbInfo = createZeroedLimbInfo(usedInventoryName);
         inventoryUseComponent.limbInfos.push(limbInfo);
      } else {
         // Existing limb info
         limbInfo = inventoryUseComponent.limbInfos[i];

         if (limbInfo.inventoryName !== usedInventoryName) {
            throw new Error();
         }
      }

      limbInfo.blockAttack = limbInfoData.blockAttack;
      
      // @INCOMPLETE no worky it brokey
      // if (limbInfoData.lastBlockTick === currentSnapshot.tick) {
      //    playBlockEffects(blockPositionX, blockPositionY, blockType);
      // }

      if (limbInfo.inventoryName === InventoryName.hotbar) {
         limbInfo.thrownBattleaxeItemID = limbInfoData.thrownBattleaxeItemID;
         inventoryState.setHotbarThrownBattleaxeItemID(limbInfoData.thrownBattleaxeItemID);
      }

      updateLimb(inventoryUseComponent, playerInstance!, i, limbInfo);
   }

   updatePlayerItems();
}