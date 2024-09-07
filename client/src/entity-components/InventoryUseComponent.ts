import { EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { Point, lerp, randFloat, randItem } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Board, { getSecondsSinceTickTimestamp } from "../Board";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import Particle from "../Particle";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/webgl/particle-rendering";
import { animateLimb, createCraftingAnimationParticles, createMedicineAnimationParticles, generateRandomLimbPosition, updateBandageRenderPart, updateCustomItemRenderPart } from "../limb-animations";
import { createDeepFrostHeartBloodParticles } from "../particles";
import { definiteGameState } from "../game-state/game-states";
import { InventoryName, ItemType, ITEM_TYPE_RECORD, Item, ITEM_INFO_RECORD, itemInfoIsUtility, itemInfoIsBow, BowItemInfo, itemInfoIsTool, ItemVars } from "webgl-test-shared/dist/items/items";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { Hotbar_updateRightThrownBattleaxeItemID } from "../components/game/inventories/Hotbar";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { DEFAULT_ATTACK_PATTERN, LimbState, TRIBESMAN_RESTING_LIMB_STATE } from "webgl-test-shared/dist/attack-patterns";
import RenderAttachPoint from "../render-parts/RenderAttachPoint";

export interface LimbInfo {
   selectedItemSlot: number;
   readonly inventoryName: InventoryName;
   bowCooldownTicks: number;
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
   /** Tick timestamp when the current action was started */
   currentActionStartingTicks: number;
   /** Expected duration of the current action in ticks */
   currentActionDurationTicks: number;

   animationStartOffset: Point;
   animationEndOffset: Point;
   animationDurationTicks: number;
   animationTicksElapsed: number;
}

/** Decimal percentage of total attack animation time spent doing the lunge part of the animation */
const ATTACK_LUNGE_TIME = 0.3;

const FOOD_EAT_INTERVAL = 0.3;

const ZOMBIE_HAND_RESTING_ROTATION = 0;
const ZOMBIE_HAND_RESTING_DIRECTION = Math.PI / 4;
const ZOMBIE_HAND_RESTING_OFFSET = 32;
   
const HAND_RESTING_DIRECTION = Math.PI * 0.4;
const HAND_RESTING_ROTATION = 0;

const SPEAR_ATTACK_LUNGE_TIME = 0.2;
const ITEM_SWING_RANGE = Math.PI / 2.5;

const ITEM_RESTING_OFFSET = 30;
const ITEM_RESTING_ROTATION = 0;
const ITEM_END_ROTATION = -Math.PI * 2/3;

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
   ]
};

type InventoryUseEntityType = EntityType.player | EntityType.tribeWorker | EntityType.tribeWarrior | EntityType.zombie;

// @Incomplete
// const getLimbRenderInfos = (entityType: InventoryUseEntityType, item: Item | null): LimbRenderInfos => {
//    const handRestingDirection = getLimbRestingDirection(entityType);
//    const restingOffset = getHandRestingOffset(entityType);

//    if (item !== null && item.type === ItemType.spear) {
//       return {
//          resting: {
//             direction: handRestingDirection,
//             offset: restingOffset,
//             rotation: ITEM_RESTING_ROTATION
//          },
//          windedBack: {
//             direction: handRestingDirection + Math.PI / 5,
//             offset: restingOffset,
//             rotation: ITEM_RESTING_ROTATION
//          },
//          swung: {
//             direction: Math.PI / 4,
//             offset: restingOffset + 7,
//             rotation: -Math.PI / 7
//          }
//       };
//    }

//    return {
//       resting: {
//          direction: handRestingDirection,
//          offset: restingOffset,
//          rotation: ITEM_RESTING_ROTATION
//       },
//       windedBack: {
//          direction: handRestingDirection + Math.PI / 5,
//          offset: restingOffset,
//          rotation: ITEM_RESTING_ROTATION
//       },
//       swung: {
//          direction: handRestingDirection - ITEM_SWING_RANGE,
//          offset: restingOffset,
//          rotation: ITEM_END_ROTATION
//       }
//    };
// }

const lerpLimbBetweenStates = (limb: RenderPart, attachPoint: RenderAttachPoint, startState: LimbState, endState: LimbState, progress: number): void => {
   const direction = lerp(startState.direction, endState.direction, progress);
   const extraOffset = lerp(startState.extraOffset, endState.extraOffset, progress);
   // @Temporary @Hack
   const offset = 32 + extraOffset;
   
   attachPoint.offset.x = offset * Math.sin(direction);
   attachPoint.offset.y = offset * Math.cos(direction);
   // @Incomplete? Hand mult
   attachPoint.rotation = lerp(startState.rotation, endState.rotation, progress);
   // limb.rotation = attackHandRotation * handMult;
}


const setLimbToState = (handMult: number, attachPoint: RenderAttachPoint, state: LimbState): void => {
   const direction = state.direction * handMult;
   // @Temporary @Hack
   const offset = 32 + state.extraOffset;

   attachPoint.offset.x = offset * Math.sin(direction);
   attachPoint.offset.y = offset * Math.cos(direction);
   // @Incomplete? Hand mult
   attachPoint.rotation = state.rotation;
   // limb.rotation = attackHandRotation * handMult;
}

const getHandRestingOffset = (entityType: InventoryUseEntityType): number => {
   switch (entityType) {
      case EntityType.player:
      case EntityType.tribeWarrior: {
         return 34;
      }
      case EntityType.tribeWorker: {
         return 30;
      }
      case EntityType.zombie: {
         return 32;
      }
   }
}

const getLimbRestingDirection = (entityType: InventoryUseEntityType): number => {
   switch (entityType) {
      case EntityType.player:
      case EntityType.tribeWarrior:
      case EntityType.tribeWorker: return HAND_RESTING_DIRECTION;
      case EntityType.zombie: return ZOMBIE_HAND_RESTING_DIRECTION;
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

class InventoryUseComponent extends ServerComponent{
   public readonly limbInfos: ReadonlyArray<LimbInfo>;

   public readonly limbAttachPoints = new Array<RenderAttachPoint>();
   public readonly limbRenderParts = new Array<RenderPart>();
   public readonly activeItemRenderParts: Record<number, TexturedRenderPart> = {};
   public readonly inactiveCrossbowArrowRenderParts: Record<number, RenderPart> = {};
   public readonly arrowRenderParts: Record<number, RenderPart> = {};

   public customItemRenderPart: RenderPart | null = null;
   public readonly bandageRenderParts = new Array<RenderPart>();
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      const useInfos = new Array<LimbInfo>();
      const numUseInfos = reader.readNumber();
      for (let i = 0; i < numUseInfos; i++) {
         const usedInventoryName = reader.readNumber() as InventoryName;
         const selectedItemSlot = reader.readNumber();
         const bowCooldownTicks = reader.readNumber();

         const spearWindupCooldowns: Partial<Record<number, number>> = {};
         const numSpearWindupCooldowns = reader.readNumber();
         for (let j = 0; j < numSpearWindupCooldowns; j++) {
            const itemSlot = reader.readNumber();
            const cooldown = reader.readNumber();
            spearWindupCooldowns[itemSlot] = cooldown;
         }

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
         const currentActionStartingTicks = reader.readNumber();
         const currentActionDurationTicks = reader.readNumber();

         const limbInfo: LimbInfo = {
            selectedItemSlot: selectedItemSlot,
            inventoryName: usedInventoryName,
            bowCooldownTicks: bowCooldownTicks,
            spearWindupCooldowns: spearWindupCooldowns,
            crossbowLoadProgressRecord: crossbowLoadProgressRecord,
            foodEatingTimer: foodEatingTimer,
            action: action,
            lastAttackTicks: lastAttackTicks,
            lastEatTicks: lastEatTicks,
            lastBowChargeTicks: lastBowChargeTicks,
            lastSpearChargeTicks: lastSpearChargeTicks,
            lastBattleaxeChargeTicks: lastBattleaxeChargeTicks,
            lastCrossbowLoadTicks: lastCrossbowLoadTicks,
            thrownBattleaxeItemID: thrownBattleaxeItemID,
            lastAttackCooldown: lastAttackCooldown,
            lastCraftTicks: lastCraftTicks,
            lastAttackWindupTicks: 0,
            currentActionStartingTicks: currentActionStartingTicks,
            currentActionDurationTicks: currentActionDurationTicks,
            animationStartOffset: new Point(0, 0),
            animationEndOffset: new Point(0, 0),
            animationDurationTicks: 0,
            animationTicksElapsed: 0
         };
         useInfos.push(limbInfo);
      }
      this.limbInfos = useInfos;
   }

   public onLoad(): void {
      const attachPoints = this.entity.getRenderThings("inventoryUseComponent:attachPoint", 2) as Array<RenderAttachPoint>;
      for (let limbIdx = 0; limbIdx < this.limbInfos.length; limbIdx++) {
         this.limbAttachPoints.push(attachPoints[limbIdx]);
      }
      
      // @Cleanup
      const handRenderParts = this.entity.getRenderThings("inventoryUseComponent:hand", 2) as Array<RenderPart>;
      for (let limbIdx = 0; limbIdx < this.limbInfos.length; limbIdx++) {
         this.limbRenderParts.push(handRenderParts[limbIdx]);
      }

      for (let i = 0; i < this.limbInfos.length; i++) {
         updateLimb(this, i, this.limbInfos[i]);
      }

      updateCustomItemRenderPart(this.entity);
   }

   public padData(reader: PacketReader): void {
      const numUseInfos = reader.readNumber();
      for (let i = 0; i < numUseInfos; i++) {
         reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);

         const numSpearWindupCooldowns = reader.readNumber();
         reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numSpearWindupCooldowns);
         
         // @Speed
         readCrossbowLoadProgressRecord(reader);

         reader.padOffset(13 * Float32Array.BYTES_PER_ELEMENT);
      }
   }
   
   public updateFromData(reader: PacketReader): void {
      const numUseInfos = reader.readNumber();
      for (let i = 0; i < numUseInfos; i++) {
         const limbInfo = this.limbInfos[i];

         const usedInventoryName = reader.readNumber() as InventoryName;
         if (limbInfo.inventoryName !== usedInventoryName) {
            console.log("Limb info i=" + i);
            console.log("Client inventory name: " + limbInfo.inventoryName);
            console.log("Server used inventory name: " + usedInventoryName);
            throw new Error();
         }
         
         const selectedItemSlot = reader.readNumber();
         const bowCooldownTicks = reader.readNumber();

         const spearWindupCooldowns: Partial<Record<number, number>> = {};
         const numSpearWindupCooldowns = reader.readNumber();
         for (let j = 0; j < numSpearWindupCooldowns; j++) {
            const itemSlot = reader.readNumber();
            const cooldown = reader.readNumber();
            spearWindupCooldowns[itemSlot] = cooldown;
         }

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
         const currentActionStartingTicks = reader.readNumber();
         const currentActionDurationTicks = reader.readNumber();

         limbInfo.bowCooldownTicks = bowCooldownTicks;
         limbInfo.selectedItemSlot = selectedItemSlot;
         limbInfo.bowCooldownTicks = bowCooldownTicks;
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
         limbInfo.currentActionStartingTicks = currentActionStartingTicks;
         limbInfo.currentActionDurationTicks = currentActionDurationTicks;

         // @Hack
         // Initial animation start position
         if (action === LimbAction.craft || action === LimbAction.researching) {
            if (limbInfo.animationStartOffset.x === -1) {
               const startOffset = generateRandomLimbPosition(i);
               limbInfo.animationStartOffset.x = startOffset.x;
               limbInfo.animationStartOffset.y = startOffset.y;

               const endOffset = generateRandomLimbPosition(i);
               limbInfo.animationEndOffset.x = endOffset.x;
               limbInfo.animationEndOffset.y = endOffset.y;
            }
         } else {
            limbInfo.animationStartOffset.x = -1;
         }
         
         updateLimb(this, i, limbInfo);
      }
   }

   public updatePlayerFromData(reader: PacketReader): void {
      const numUseInfos = reader.readNumber();
      for (let i = 0; i < numUseInfos; i++) {
         const limbInfo = this.limbInfos[i];

         const usedInventoryName = reader.readNumber() as InventoryName;
         if (limbInfo.inventoryName !== usedInventoryName) {
            throw new Error();
         }

         reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);

         const numSpearWindupCooldowns = reader.readNumber();
         reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numSpearWindupCooldowns);

         // @Speed
         readCrossbowLoadProgressRecord(reader);

         reader.padOffset(9 * Float32Array.BYTES_PER_ELEMENT);
         const thrownBattleaxeItemID = reader.readNumber();
         reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);

         if (limbInfo.inventoryName === InventoryName.hotbar) {
            limbInfo.thrownBattleaxeItemID = thrownBattleaxeItemID;
            Hotbar_updateRightThrownBattleaxeItemID(thrownBattleaxeItemID);
         }
      }
   }

   public getLimbInfoByInventoryName(inventoryName: InventoryName): LimbInfo {
      for (let i = 0; i < this.limbInfos.length; i++) {
         const useInfo = this.limbInfos[i];
         if (useInfo.inventoryName === inventoryName) {
            return useInfo;
         }
      }

      throw new Error();
   }
}

export default InventoryUseComponent;

export const InventoryUseComponentArray = new ComponentArray<InventoryUseComponent>(ComponentArrayType.server, ServerComponentType.inventoryUse, true, {
   onTick: onTick,
   onUpdate: onUpdate
});

function onTick(inventoryUseComponent: InventoryUseComponent): void {
   // @Cleanup: move to separate function
   const inventoryComponent = inventoryUseComponent.entity.getServerComponent(ServerComponentType.inventory);
   for (let limbIdx = 0; limbIdx < inventoryUseComponent.limbInfos.length; limbIdx++) {
      const useInfo = inventoryUseComponent.limbInfos[limbIdx];
      const inventory = inventoryComponent.getInventory(useInfo.inventoryName);

      // @Incomplete: If eating multiple foods at once, shouldn't be on the same tick interval
      if (!Board.tickIntervalHasPassed(0.25)) {
         continue;
      }

      const item = inventory.itemSlots[useInfo.selectedItemSlot];
      if (typeof item === "undefined") {
         continue;
      }
      
      const physicsComponent = inventoryUseComponent.entity.getServerComponent(ServerComponentType.physics);

      // Make the deep frost heart item spew blue blood particles
      if (item.type === ItemType.deepfrost_heart) {
         const activeItemRenderPart = inventoryUseComponent.activeItemRenderParts[limbIdx];
         createDeepFrostHeartBloodParticles(activeItemRenderPart.renderPosition.x, activeItemRenderPart.renderPosition.y, physicsComponent.selfVelocity.x, physicsComponent.selfVelocity.y);
      }

      if (useInfo.action === LimbAction.eat && ITEM_TYPE_RECORD[item.type] === "healing") {
         const transformComponent = inventoryUseComponent.entity.getServerComponent(ServerComponentType.transform);

         // Create food eating particles
         for (let i = 0; i < 3; i++) {
            let spawnPositionX = transformComponent.position.x + 37 * Math.sin(transformComponent.rotation);
            let spawnPositionY = transformComponent.position.y + 37 * Math.cos(transformComponent.rotation);

            const spawnOffsetMagnitude = randFloat(0, 6);
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            let velocityMagnitude = randFloat(130, 170);
            const velocityDirection = 2 * Math.PI * Math.random();
            const velocityX = velocityMagnitude * Math.sin(velocityDirection) + physicsComponent.selfVelocity.x;
            const velocityY = velocityMagnitude * Math.cos(velocityDirection) + physicsComponent.selfVelocity.y;
            velocityMagnitude += physicsComponent.selfVelocity.length();
            
            const lifetime = randFloat(0.3, 0.4);

            const particle = new Particle(lifetime);
            particle.getOpacity = () => {
               return 1 - Math.pow(particle.age / lifetime, 3);
            }

            const colour = randItem(FOOD_EATING_COLOURS[item.type as keyof typeof FOOD_EATING_COLOURS]);

            // @Cleanup @Incomplete: move to particles file
            addMonocolourParticleToBufferContainer(
               particle,
               ParticleRenderLayer.low,
               6, 6,
               spawnPositionX, spawnPositionY,
               velocityX, velocityY,
               0, 0,
               velocityMagnitude / lifetime / 1.3,
               2 * Math.PI * Math.random(),
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
      updateBandageRenderPart(inventoryUseComponent.entity, renderPart);
   }

   updateCustomItemRenderPart(inventoryUseComponent.entity);
}

const updateActiveItemRenderPart = (inventoryUseComponent: InventoryUseComponent, limbIdx: number, limbInfo: LimbInfo, activeItem: Item | null, shouldShow: boolean): void => {
   if (activeItem === null || !shouldShow) {
      if (inventoryUseComponent.activeItemRenderParts.hasOwnProperty(limbIdx)) {
         inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.activeItemRenderParts[limbIdx]);
         delete inventoryUseComponent.activeItemRenderParts[limbIdx];
      }

      if (inventoryUseComponent.inactiveCrossbowArrowRenderParts.hasOwnProperty(limbIdx)) {
         inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.inactiveCrossbowArrowRenderParts[limbIdx]);
         delete inventoryUseComponent.inactiveCrossbowArrowRenderParts[limbIdx];
      }

      if (inventoryUseComponent.arrowRenderParts.hasOwnProperty(limbIdx)) {
         inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.arrowRenderParts[limbIdx]);
         delete inventoryUseComponent.arrowRenderParts[limbIdx];
      }
   } else {
      if (!inventoryUseComponent.activeItemRenderParts.hasOwnProperty(limbIdx)) {
         const renderPart = new TexturedRenderPart(
            inventoryUseComponent.limbAttachPoints[limbIdx],
            limbIdx === 0 ? 1.15 : 1.1,
            0,
            activeItem !== null ? getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItem.type].entityTextureSource) : -1
         );
         inventoryUseComponent.entity.attachRenderThing(renderPart);
         inventoryUseComponent.activeItemRenderParts[limbIdx] = renderPart;
      }

      const activeItemRenderPart = inventoryUseComponent.activeItemRenderParts[limbIdx];
      activeItemRenderPart.flipX = limbIdx === 1;
      
      const itemInfo = ITEM_INFO_RECORD[activeItem.type];
      if (itemInfoIsUtility(activeItem.type, itemInfo)) {
         // @Hack: only works for player
         // Change the bow charging texture based on the charge progress
         if ((limbInfo.action === LimbAction.chargeBow || limbInfo.action === LimbAction.loadCrossbow || typeof definiteGameState.hotbarCrossbowLoadProgressRecord[limbInfo.selectedItemSlot] !== "undefined") && itemInfoIsBow(activeItem.type, itemInfo)) {
            const lastActionTicks = limbInfo.action === LimbAction.chargeBow ? limbInfo.lastBowChargeTicks : limbInfo.lastCrossbowLoadTicks;
            const secondsSinceLastAction = getSecondsSinceTickTimestamp(lastActionTicks);
            // @Hack: why does itemInfoIsBow not narrow this fully??
            const chargeProgress = secondsSinceLastAction / (itemInfo as BowItemInfo).shotCooldownTicks * Settings.TPS;

            let textureSourceArray: ReadonlyArray<string>;
            let arrowTextureSource: string;
            switch (activeItem.type) {
               case ItemType.wooden_bow: {
                  textureSourceArray = BOW_CHARGE_TEXTURE_SOURCES;
                  arrowTextureSource = "projectiles/wooden-arrow.png";
                  break;
               }
               case ItemType.reinforced_bow: {
                  textureSourceArray = REINFORCED_BOW_CHARGE_TEXTURE_SOURCES;
                  arrowTextureSource = "projectiles/wooden-arrow.png";
                  break;
               }
               case ItemType.ice_bow: {
                  textureSourceArray = ICE_BOW_CHARGE_TEXTURE_SOURCES;
                  arrowTextureSource = "projectiles/ice-arrow.png";
                  break;
               }
               case ItemType.crossbow: {
                  textureSourceArray = CROSSBOW_CHARGE_TEXTURE_SOURCES;
                  arrowTextureSource = "projectiles/wooden-arrow.png";
                  break;
               }
               default: {
                  const tribesmanComponent = inventoryUseComponent.entity.getServerComponent(ServerComponentType.tribesmanAI);
                  console.log(tribesmanComponent.aiType);
                  console.log(limbIdx);
                  console.log(activeItem);
                  throw new Error("Not bow");
               }
            }

            if (!inventoryUseComponent.arrowRenderParts.hasOwnProperty(limbIdx)) {
               inventoryUseComponent.arrowRenderParts[limbIdx] = new TexturedRenderPart(
                  inventoryUseComponent.activeItemRenderParts[limbIdx],
                  inventoryUseComponent.activeItemRenderParts[limbIdx].zIndex + 0.1,
                  Math.PI/4,
                  getTextureArrayIndex(arrowTextureSource)
               );
               inventoryUseComponent.entity.attachRenderThing(inventoryUseComponent.arrowRenderParts[limbIdx]);
            }

            let textureIdx = Math.floor(chargeProgress * textureSourceArray.length);
            if (textureIdx >= textureSourceArray.length) {
               textureIdx = textureSourceArray.length - 1;
            }
            inventoryUseComponent.activeItemRenderParts[limbIdx].switchTextureSource(textureSourceArray[textureIdx]);
         } else if (inventoryUseComponent.arrowRenderParts.hasOwnProperty(limbIdx)) {
            inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.arrowRenderParts[limbIdx]);
            delete inventoryUseComponent.arrowRenderParts[limbIdx];
         }

         // if (useInfo.currentAction === LimbAction.none && )
         // @Incomplete: Only works for player
         // @Incomplete
         // if (limbIdx === 0 && this.rightAction === LimbAction.none && activeItem.type === ItemType.crossbow && definiteGameState.hotbarCrossbowLoadProgressRecord.hasOwnProperty(latencyGameState.selectedHotbarItemSlot) && definiteGameState.hotbarCrossbowLoadProgressRecord[latencyGameState.selectedHotbarItemSlot] === 1) {
         //    renderPart.switchTextureSource("miscellaneous/crossbow-charge-5.png");

         //    if (this.inactiveCrossbowArrowRenderPart === null) {
         //       const arrowTextureSource = "projectiles/wooden-arrow.png";

         //       this.inactiveCrossbowArrowRenderPart = new RenderPart(
         //          this.activeItemRenderParts[0],
         //          getTextureArrayIndex(arrowTextureSource),
         //          this.activeItemRenderParts[0].zIndex + 0.1,
         //          Math.PI/4
         //       );
         //       this.attachRenderPart(this.inactiveCrossbowArrowRenderPart);
         //    }
         // } else {
            activeItemRenderPart.switchTextureSource(CLIENT_ITEM_INFO_RECORD[activeItem.type].toolTextureSource);
         
         if (inventoryUseComponent.inactiveCrossbowArrowRenderParts.hasOwnProperty(limbIdx)) {
            inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.inactiveCrossbowArrowRenderParts[limbIdx]);
            delete inventoryUseComponent.inactiveCrossbowArrowRenderParts[limbIdx];
         }
         // }
      } else {
         activeItemRenderPart.switchTextureSource(CLIENT_ITEM_INFO_RECORD[activeItem.type].entityTextureSource);
      }
   }
}

const updateLimb = (inventoryUseComponent: InventoryUseComponent, limbIdx: number, limbInfo: LimbInfo): void => {
   // @Bug: The itemSize variable will be one tick too slow as it gets the size of the item before it has been updated
   
   const limb = inventoryUseComponent.limbRenderParts[limbIdx];
   const attachPoint = inventoryUseComponent.limbAttachPoints[limbIdx];
   
   limb.shakeAmount = 0;

   const limbMult = limbIdx === 0 ? 1 : -1;
   
   // Special case if the entity is drawing a bow
   // Two hands are needed to draw a bow, one from each side of the entity

   // @Hack?
   if (inventoryUseComponent.limbInfos.length > 1) {
      const otherUseInfo = inventoryUseComponent.limbInfos[limbIdx === 0 ? 1 : 0];
      if (otherUseInfo.action === LimbAction.chargeBow || otherUseInfo.action === LimbAction.loadCrossbow) {
         const otherLastActionTicks = otherUseInfo.action === LimbAction.chargeBow ? otherUseInfo.lastBowChargeTicks : otherUseInfo.lastCrossbowLoadTicks;
         const otherSecondsSinceLastAction = getSecondsSinceTickTimestamp(otherLastActionTicks);

         let chargeProgress = otherSecondsSinceLastAction;
         if (chargeProgress > 1) {
            chargeProgress = 1;
         }

         const pullbackOffset = lerp(50, 30, chargeProgress);
         
         inventoryUseComponent.limbRenderParts[limbIdx].offset.x = -3;
         inventoryUseComponent.limbRenderParts[limbIdx].offset.y = pullbackOffset;
         inventoryUseComponent.limbRenderParts[limbIdx].rotation = 0;
         return;
      }
   }
   
   const inventoryComponent = inventoryUseComponent.entity.getServerComponent(ServerComponentType.inventory);
   const inventory = inventoryComponent.getInventory(limbInfo.inventoryName);
   
   let item: Item | null | undefined = inventory.itemSlots[limbInfo.selectedItemSlot];
   
   if (typeof item === "undefined" || limbInfo.thrownBattleaxeItemID === item.id) {
      item = null;
   }
   
   const itemSize = item !== null && itemInfoIsTool(item.type, ITEM_INFO_RECORD[item.type]) ? 8 * 4 : 4 * 4;
   
   // @Hack
   updateActiveItemRenderPart(inventoryUseComponent, limbIdx, limbInfo, item, true);
   const itemRenderPart = inventoryUseComponent.activeItemRenderParts[limbIdx];
   
   let shouldShowActiveItemRenderPart = true;

   // @Hack
   // Zombie lunge attack
   if (inventoryUseComponent.entity.type === EntityType.zombie) {
      const inventoryComponent = inventoryUseComponent.entity.getServerComponent(ServerComponentType.inventory);
      const heldItemInventory = inventoryComponent.getInventory(InventoryName.handSlot);
      if (!heldItemInventory.itemSlots.hasOwnProperty(1)) {
         const secondsSinceLastAction = getSecondsSinceTickTimestamp(limbInfo.lastAttackTicks);
         
         let attackProgress = secondsSinceLastAction / ATTACK_LUNGE_TIME;
         if (attackProgress > 1) {
            attackProgress = 1;
         }

         const direction = lerp(Math.PI / 7, ZOMBIE_HAND_RESTING_DIRECTION, attackProgress) * limbMult;
         const offset = lerp(42, ZOMBIE_HAND_RESTING_OFFSET, attackProgress);
         
         limb.offset.x = offset * Math.sin(direction);
         limb.offset.y = offset * Math.cos(direction);
         limb.rotation = lerp(-Math.PI/8, ZOMBIE_HAND_RESTING_ROTATION, attackProgress) * limbMult;
         return;
      }
   }

   switch (limbInfo.action) {
      case LimbAction.windAttack: {
         const secondsSinceLastAction = getSecondsSinceTickTimestamp(limbInfo.currentActionStartingTicks);
         const windupProgress = secondsSinceLastAction * Settings.TPS / limbInfo.currentActionDurationTicks;

         lerpLimbBetweenStates(limb, attachPoint, TRIBESMAN_RESTING_LIMB_STATE, DEFAULT_ATTACK_PATTERN.windedBack, windupProgress);
         
         break;
      }
      case LimbAction.attack: {
         const secondsSinceLastAction = getSecondsSinceTickTimestamp(limbInfo.currentActionStartingTicks);
         const attackProgress = secondsSinceLastAction * Settings.TPS / limbInfo.currentActionDurationTicks;

         lerpLimbBetweenStates(limb, attachPoint, DEFAULT_ATTACK_PATTERN.windedBack, DEFAULT_ATTACK_PATTERN.swung, attackProgress);
         break;
      }
      case LimbAction.returnAttackToRest: {
         const secondsIntoAnimation = getSecondsSinceTickTimestamp(limbInfo.currentActionStartingTicks);
         const animationProgress = secondsIntoAnimation * Settings.TPS / limbInfo.currentActionDurationTicks;

         lerpLimbBetweenStates(limb, attachPoint, DEFAULT_ATTACK_PATTERN.swung, TRIBESMAN_RESTING_LIMB_STATE, animationProgress);

         break;
      }
      case LimbAction.none: {
         setLimbToState(limbMult, attachPoint, TRIBESMAN_RESTING_LIMB_STATE);
         break;
      }
      // Bow charge animation
      case LimbAction.loadCrossbow:
      case LimbAction.chargeBow: {
         const lastActionTicks = limbInfo.action === LimbAction.loadCrossbow ? limbInfo.lastCrossbowLoadTicks : limbInfo.lastBowChargeTicks;
         const secondsSinceLastAction = getSecondsSinceTickTimestamp(lastActionTicks);
         
         // @Incomplete
         if (inventoryUseComponent.arrowRenderParts.hasOwnProperty(limbIdx)) {
            let chargeProgress = secondsSinceLastAction;
            if (chargeProgress > 1) {
               chargeProgress = 1;
            }

            const pullbackOffset = lerp(10, -8, chargeProgress);
            inventoryUseComponent.arrowRenderParts[limbIdx].offset.x = pullbackOffset;
            inventoryUseComponent.arrowRenderParts[limbIdx].offset.y = pullbackOffset;
         }

         limb.offset.x = 10 * limbMult;
         limb.offset.y = 60;
         limb.rotation = 0;

         itemRenderPart.offset.x = -10 * limbMult;
         itemRenderPart.offset.y = -10;
         itemRenderPart.rotation = -Math.PI / 4;
         break;
      }
      case LimbAction.chargeBattleaxe:
      case LimbAction.chargeSpear: {
         // 
         // Spear charge animation
         // 
         const lastActionTicks = limbInfo.action === LimbAction.chargeBattleaxe ? limbInfo.lastBattleaxeChargeTicks : limbInfo.lastSpearChargeTicks;
         const secondsSinceLastAction = getSecondsSinceTickTimestamp(lastActionTicks);
         const chargeProgress = secondsSinceLastAction < 3 ? 1 - Math.pow(secondsSinceLastAction / 3 - 1, 2) : 1;

         const handRestingDirection = getLimbRestingDirection(inventoryUseComponent.entity.type as InventoryUseEntityType);
         const handDirection = lerp(handRestingDirection, Math.PI / 1.5, chargeProgress) * limbMult;

         const handRestingOffset = getHandRestingOffset(inventoryUseComponent.entity.type as InventoryUseEntityType);
         limb.offset.x = handRestingOffset * Math.sin(handDirection);
         limb.offset.y = handRestingOffset * Math.cos(handDirection);

         if (limbInfo.action === LimbAction.chargeSpear) {
            limb.rotation = lerp(ITEM_RESTING_ROTATION, Math.PI / 3.5, chargeProgress) * limbMult;
            itemRenderPart.offset.x = 5;
            itemRenderPart.offset.y = 11;
            itemRenderPart.rotation = 0;
         } else {
            limb.rotation = lerp(Math.PI / 4.2, Math.PI / 2.5, chargeProgress) * limbMult;
            itemRenderPart.offset.x = 12;
            itemRenderPart.offset.y = 36;
            itemRenderPart.rotation = -Math.PI/6 * limbMult;
         }

         if (item !== null && limbInfo.thrownBattleaxeItemID === item.id) {
            shouldShowActiveItemRenderPart = false;
         }

         limb.shakeAmount = lerp(0, 1.5, chargeProgress);
         break;
      }
      case LimbAction.craft: {
         animateLimb(limb, limbIdx, limbInfo);
         createCraftingAnimationParticles(inventoryUseComponent.entity, limbIdx);
         shouldShowActiveItemRenderPart = false;
         break;
      }
      case LimbAction.useMedicine: {
         animateLimb(limb, limbIdx, limbInfo);
         createMedicineAnimationParticles(inventoryUseComponent.entity, limbIdx);
         shouldShowActiveItemRenderPart = false;
         break;
      }
      case LimbAction.researching: {
         animateLimb(limb, limbIdx, limbInfo);
         shouldShowActiveItemRenderPart = false;
         break;
      }
      case LimbAction.eat: {
         // 
         // Eating animation
         // 
      
         const secondsSinceLastAction = getSecondsSinceTickTimestamp(limbInfo.lastEatTicks);
         let eatIntervalProgress = (secondsSinceLastAction % FOOD_EAT_INTERVAL) / FOOD_EAT_INTERVAL * 2;
         if (eatIntervalProgress > 1) {
            eatIntervalProgress = 2 - eatIntervalProgress;
         }
         
         let activeItemDirection = Math.PI / 4;
         activeItemDirection -= lerp(0, Math.PI/5, eatIntervalProgress);

         const insetAmount = lerp(0, 17, eatIntervalProgress);

         const handRestingOffset = getHandRestingOffset(inventoryUseComponent.entity.type as InventoryUseEntityType);
         const handOffsetAmount = handRestingOffset - insetAmount;
         limb.offset.x = handOffsetAmount * Math.sin(activeItemDirection);
         limb.offset.y = handOffsetAmount * Math.cos(activeItemDirection);
         limb.rotation = lerp(HAND_RESTING_ROTATION, HAND_RESTING_ROTATION - Math.PI/5, eatIntervalProgress) * limbMult;

         const activeItemOffsetAmount = ITEM_RESTING_OFFSET + itemSize/2 - insetAmount;
         const activeItemOffsetDirection = (activeItemDirection - Math.PI/14) * limbMult;
         limb.offset.x = activeItemOffsetAmount * Math.sin(activeItemOffsetDirection);
         limb.offset.y = activeItemOffsetAmount * Math.cos(activeItemOffsetDirection);
         limb.rotation = lerp(0, -Math.PI/3, eatIntervalProgress) * limbMult;
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

   updateActiveItemRenderPart(inventoryUseComponent, limbIdx, limbInfo, item, shouldShowActiveItemRenderPart);
}

function onUpdate(inventoryUseComponent: InventoryUseComponent): void {
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const useInfo = inventoryUseComponent.limbInfos[i];
      updateLimb(inventoryUseComponent, i, useInfo);
   }
}