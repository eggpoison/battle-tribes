import { BowItemInfo, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, InventoryName, Item, ItemType } from "webgl-test-shared/dist/items";
import { EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { Point, lerp, randFloat, randItem } from "webgl-test-shared/dist/utils";
import { InventoryUseComponentData, LimbData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Board from "../Board";
import { getSecondsSinceLastAction } from "../entities/TribeMember";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import Particle from "../Particle";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import { createDeepFrostHeartBloodParticles } from "../items/ItemEntity";
import { animateLimb, createCraftingAnimationParticles, createMedicineAnimationParticles, generateRandomLimbPosition, updateBandageRenderPart, updateCustomItemRenderPart } from "../limb-animations";

export interface LimbInfo {
   selectedItemSlot: number;
   readonly inventoryName: InventoryName;
   bowCooldownTicks: number;
   itemAttackCooldowns: Partial<Record<number, number>>;
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
   thrownBattleaxeItemID: number;
   lastAttackCooldown: number;

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
   
const HAND_RESTING_DIRECTION = Math.PI / 2.5;
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

const getLastActionTicks = (useInfo: LimbData): number => {
   switch (useInfo.action) {
      case LimbAction.chargeBow: {
         return useInfo.lastBowChargeTicks;
      }
      case LimbAction.chargeSpear: {
         return useInfo.lastSpearChargeTicks;
      }
      case LimbAction.chargeBattleaxe: {
         return useInfo.lastBattleaxeChargeTicks;
      }
      case LimbAction.loadCrossbow: {
         return useInfo.lastCrossbowLoadTicks;
      }
      case LimbAction.eat:
      case LimbAction.useMedicine: {
         return useInfo.lastEatTicks;
      }
      case LimbAction.none: {
         return useInfo.lastAttackTicks;
      }
      case LimbAction.craft:
      case LimbAction.researching: {
         // @Incomplete
         return Board.ticks;
      }
   }
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

const showLargeItemTexture = (itemType: ItemType): boolean => {
   const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
   return itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "bow" || itemTypeInfo === "pickaxe" || itemTypeInfo === "spear" || itemTypeInfo === "hammer" || itemTypeInfo === "battleaxe" || itemTypeInfo === "crossbow";
}

const getLimbRestingDirection = (entityType: InventoryUseEntityType): number => {
   switch (entityType) {
      case EntityType.player:
      case EntityType.tribeWarrior:
      case EntityType.tribeWorker: return HAND_RESTING_DIRECTION;
      case EntityType.zombie: return ZOMBIE_HAND_RESTING_DIRECTION;
   }
}

class InventoryUseComponent extends ServerComponent<ServerComponentType.inventoryUse> {
   public readonly useInfos: ReadonlyArray<LimbInfo>;
   public readonly limbRenderParts = new Array<RenderPart>();
   private readonly activeItemRenderParts: Record<number, RenderPart> = {};
   private readonly inactiveCrossbowArrowRenderParts: Record<number, RenderPart> = {};
   private readonly arrowRenderParts: Record<number, RenderPart> = {};

   public customItemRenderPart: RenderPart | null = null;
   public readonly bandageRenderParts = new Array<RenderPart>();
   
   constructor(entity: Entity, data: InventoryUseComponentData, handRenderParts: ReadonlyArray<RenderPart>) {
      super(entity);
      
      const useInfos = new Array<LimbInfo>();
      for (let i = 0; i < data.inventoryUseInfos.length; i++) {
         const limbData = data.inventoryUseInfos[i];

         const limbInfo: LimbInfo = {
            selectedItemSlot: limbData.selectedItemSlot,
            inventoryName: limbData.inventoryName,
            bowCooldownTicks: limbData.bowCooldownTicks,
            itemAttackCooldowns: limbData.itemAttackCooldowns,
            spearWindupCooldowns: limbData.spearWindupCooldowns,
            crossbowLoadProgressRecord: limbData.crossbowLoadProgressRecord,
            foodEatingTimer: limbData.foodEatingTimer,
            action: limbData.action,
            lastAttackTicks: limbData.lastAttackTicks,
            lastEatTicks: limbData.lastEatTicks,
            lastBowChargeTicks: limbData.lastBowChargeTicks,
            lastSpearChargeTicks: limbData.lastSpearChargeTicks,
            lastBattleaxeChargeTicks: limbData.lastBattleaxeChargeTicks,
            lastCrossbowLoadTicks: limbData.lastCrossbowLoadTicks,
            thrownBattleaxeItemID: limbData.thrownBattleaxeItemID,
            lastAttackCooldown: limbData.lastAttackCooldown,
            lastCraftTicks: limbData.lastCraftTicks,
            animationStartOffset: new Point(0, 0),
            animationEndOffset: new Point(0, 0),
            animationDurationTicks: 0,
            animationTicksElapsed: 0
         };
         useInfos.push(limbInfo);
      }
      this.useInfos = useInfos;
      
      // @Cleanup
      for (let limbIdx = 0; limbIdx < data.inventoryUseInfos.length; limbIdx++) {
         this.limbRenderParts.push(handRenderParts[limbIdx]);
      }
   }

   public onLoad(): void {
      for (let i = 0; i < this.useInfos.length; i++) {
         this.updateLimb(i, this.useInfos[i]);
      }

      updateCustomItemRenderPart(this.entity);
   }

   public tick(): void {
      // @Cleanup: move to separate function
      const inventoryComponent = this.entity.getServerComponent(ServerComponentType.inventory);
      for (let limbIdx = 0; limbIdx < this.useInfos.length; limbIdx++) {
         const useInfo = this.useInfos[limbIdx];
         const inventory = inventoryComponent.getInventory(useInfo.inventoryName);

         // @Incomplete: If eating multiple foods at once, shouldn't be on the same tick interval
         if (!Board.tickIntervalHasPassed(0.25)) {
            continue;
         }
   
         const item = inventory.itemSlots[useInfo.selectedItemSlot];
         if (typeof item === "undefined") {
            continue;
         }
         

         // Make the deep frost heart item spew blue blood particles
         if (item.type === ItemType.deepfrost_heart) {
            const activeItemRenderPart = this.activeItemRenderParts[limbIdx];
            createDeepFrostHeartBloodParticles(activeItemRenderPart.renderPosition.x, activeItemRenderPart.renderPosition.y, this.entity.velocity.x, this.entity.velocity.y);
         }

         if (useInfo.action === LimbAction.eat && ITEM_TYPE_RECORD[item.type] === "healing") {
            // Create food eating particles
            for (let i = 0; i < 3; i++) {
               let spawnPositionX = this.entity.position.x + 37 * Math.sin(this.entity.rotation);
               let spawnPositionY = this.entity.position.y + 37 * Math.cos(this.entity.rotation);
   
               const spawnOffsetMagnitude = randFloat(0, 6);
               const spawnOffsetDirection = 2 * Math.PI * Math.random();
               spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
               spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
   
               let velocityMagnitude = randFloat(130, 170);
               const velocityDirection = 2 * Math.PI * Math.random();
               const velocityX = velocityMagnitude * Math.sin(velocityDirection) + this.entity.velocity.x;
               const velocityY = velocityMagnitude * Math.cos(velocityDirection) + this.entity.velocity.y;
               velocityMagnitude += this.entity.velocity.length();
               
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

      for (let i = 0; i < this.bandageRenderParts.length; i++) {
         const renderPart = this.bandageRenderParts[i];
         updateBandageRenderPart(this.entity, renderPart);
      }

      updateCustomItemRenderPart(this.entity);
   }

   private updateActiveItemRenderPart(limbIdx: number, useInfo: LimbData, activeItem: Item | null, shouldShow: boolean): void {
      if (activeItem === null || !shouldShow) {
         if (this.activeItemRenderParts.hasOwnProperty(limbIdx)) {
            this.entity.removeRenderPart(this.activeItemRenderParts[limbIdx]);
            delete this.activeItemRenderParts[limbIdx];
         }

         if (this.inactiveCrossbowArrowRenderParts.hasOwnProperty(limbIdx)) {
            this.entity.removeRenderPart(this.inactiveCrossbowArrowRenderParts[limbIdx]);
            delete this.inactiveCrossbowArrowRenderParts[limbIdx];
         }

         if (this.arrowRenderParts.hasOwnProperty(limbIdx)) {
            this.entity.removeRenderPart(this.arrowRenderParts[limbIdx]);
            delete this.arrowRenderParts[limbIdx];
         }
      } else {
         if (!this.activeItemRenderParts.hasOwnProperty(limbIdx)) {
            const renderPart = new RenderPart(
               this.limbRenderParts[limbIdx],
               activeItem !== null ? getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItem.type].entityTextureSource) : -1,
               limbIdx === 0 ? 0.5 : 0,
               0
            );
            this.entity.attachRenderPart(renderPart);
            this.activeItemRenderParts[limbIdx] = renderPart;
         }

         const activeItemRenderPart = this.activeItemRenderParts[limbIdx];
         activeItemRenderPart.flipX = limbIdx === 1;
         
         if (showLargeItemTexture(activeItem.type)) {
            // Change the bow charging texture based on the charge progress
            if (useInfo.action === LimbAction.chargeBow || useInfo.action === LimbAction.loadCrossbow) {
               const bowInfo = ITEM_INFO_RECORD[activeItem.type] as BowItemInfo;
               
               const lastActionTicks = useInfo.action === LimbAction.chargeBow ? useInfo.lastBowChargeTicks : useInfo.lastCrossbowLoadTicks;
               const secondsSinceLastAction = getSecondsSinceLastAction(lastActionTicks);
               const chargeProgress = secondsSinceLastAction / bowInfo.shotCooldownTicks * Settings.TPS;

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
                     const tribesmanComponent = this.entity.getServerComponent(ServerComponentType.tribesman);
                     console.log(tribesmanComponent.aiType);
                     console.log(limbIdx);
                     console.log(activeItem);
                     throw new Error("Not bow");
                  }
               }

               if (!this.arrowRenderParts.hasOwnProperty(limbIdx)) {
                  this.arrowRenderParts[limbIdx] = new RenderPart(
                     this.activeItemRenderParts[limbIdx],
                     getTextureArrayIndex(arrowTextureSource),
                     this.activeItemRenderParts[limbIdx].zIndex + 0.1,
                     Math.PI/4
                  );
                  this.entity.attachRenderPart(this.arrowRenderParts[limbIdx]);
               }

               let textureIdx = Math.floor(chargeProgress * textureSourceArray.length);
               if (textureIdx >= textureSourceArray.length) {
                  textureIdx = textureSourceArray.length - 1;
               }
               this.activeItemRenderParts[limbIdx].switchTextureSource(textureSourceArray[textureIdx]);
            } else if (this.arrowRenderParts.hasOwnProperty(limbIdx)) {
               this.entity.removeRenderPart(this.arrowRenderParts[limbIdx]);
               delete this.arrowRenderParts[limbIdx];
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
            
            if (this.inactiveCrossbowArrowRenderParts.hasOwnProperty(limbIdx)) {
               this.entity.removeRenderPart(this.inactiveCrossbowArrowRenderParts[limbIdx]);
               delete this.inactiveCrossbowArrowRenderParts[limbIdx];
            }
            // }
         } else {
            activeItemRenderPart.switchTextureSource(CLIENT_ITEM_INFO_RECORD[activeItem.type].entityTextureSource);
         }
      }
   }

   private updateLimb(limbIdx: number, limbInfo: LimbInfo): void {
      // @Bug: The itemSize variable will be one tick too slow as it gets the size of the item before it has been updated
      
      const limb = this.limbRenderParts[limbIdx];
      limb.shakeAmount = 0;

      const handMult = limbIdx === 0 ? 1 : -1;
      
      // @Speed: Has exactly the same switch statement as the switch (useInfo.currentAction). Doing same switch twice!!
      const lastActionTicks = getLastActionTicks(limbInfo);
      const secondsSinceLastAction = getSecondsSinceLastAction(lastActionTicks)

      // Special case if the entity is drawing a bow
      // Two hands are needed to draw a bow, one from each side of the entity

      if (this.useInfos.length > 1) {
         const otherUseInfo = this.useInfos[limbIdx === 0 ? 1 : 0];
         if (otherUseInfo.action === LimbAction.chargeBow || otherUseInfo.action === LimbAction.loadCrossbow) {
            const otherLastActionTicks = getLastActionTicks(otherUseInfo);
            const otherSecondsSinceLastAction = getSecondsSinceLastAction(otherLastActionTicks);
   
            let chargeProgress = otherSecondsSinceLastAction;
            if (chargeProgress > 1) {
               chargeProgress = 1;
            }
   
            const pullbackOffset = lerp(50, 30, chargeProgress);
            
            this.limbRenderParts[limbIdx].offset.x = -3;
            this.limbRenderParts[limbIdx].offset.y = pullbackOffset;
            this.limbRenderParts[limbIdx].rotation = 0;
            return;
         }
      }

      
      const inventoryComponent = this.entity.getServerComponent(ServerComponentType.inventory);
      const inventory = inventoryComponent.getInventory(limbInfo.inventoryName);
      
      let item: Item | null | undefined = inventory.itemSlots[limbInfo.selectedItemSlot];

      if (typeof item === "undefined" || limbInfo.thrownBattleaxeItemID === item.id) {
         item = null;
      }
      
      const itemSize = item !== null && showLargeItemTexture(item.type) ? 8 * 4 : 4 * 4;
      
      // @Hack
      this.updateActiveItemRenderPart(limbIdx, limbInfo, item, true);
      const itemRenderPart = this.activeItemRenderParts[limbIdx];
      
      let shouldShowActiveItemRenderPart = true;

      // Zombie lunge attack
      if (this.entity.type === EntityType.zombie) {
         const inventoryComponent = this.entity.getServerComponent(ServerComponentType.inventory);
         const heldItemInventory = inventoryComponent.getInventory(InventoryName.handSlot);
         if (!heldItemInventory.itemSlots.hasOwnProperty(1)) {
            let attackProgress = secondsSinceLastAction / ATTACK_LUNGE_TIME;
            if (attackProgress > 1) {
               attackProgress = 1;
            }
   
            const direction = lerp(Math.PI / 7, ZOMBIE_HAND_RESTING_DIRECTION, attackProgress) * handMult;
            const offset = lerp(42, ZOMBIE_HAND_RESTING_OFFSET, attackProgress);
            
            limb.offset.x = offset * Math.sin(direction);
            limb.offset.y = offset * Math.cos(direction);
            limb.rotation = lerp(-Math.PI/8, ZOMBIE_HAND_RESTING_ROTATION, attackProgress) * handMult;
            return;
         }
      }

      switch (limbInfo.action) {
         // Bow charge animation
         case LimbAction.loadCrossbow:
         case LimbAction.chargeBow: {
            // @Incomplete
            if (this.arrowRenderParts.hasOwnProperty(limbIdx)) {
               let chargeProgress = secondsSinceLastAction;
               if (chargeProgress > 1) {
                  chargeProgress = 1;
               }

               const pullbackOffset = lerp(10, -8, chargeProgress);
               this.arrowRenderParts[limbIdx].offset.x = pullbackOffset;
               this.arrowRenderParts[limbIdx].offset.y = pullbackOffset;
            }

            limb.offset.x = 10 * handMult;
            limb.offset.y = 60;
            limb.rotation = 0;

            itemRenderPart.offset.x = -10 * handMult;
            itemRenderPart.offset.y = -10;
            itemRenderPart.rotation = -Math.PI / 4;
            break;
         }
         case LimbAction.chargeBattleaxe:
         case LimbAction.chargeSpear: {
            // 
            // Spear charge animation
            // 
            const chargeProgress = secondsSinceLastAction < 3 ? 1 - Math.pow(secondsSinceLastAction / 3 - 1, 2) : 1;

            const handRestingDirection = getLimbRestingDirection(this.entity.type as InventoryUseEntityType);
            const handDirection = lerp(handRestingDirection, Math.PI / 1.5, chargeProgress) * handMult;

            const handRestingOffset = getHandRestingOffset(this.entity.type as InventoryUseEntityType);
            limb.offset.x = handRestingOffset * Math.sin(handDirection);
            limb.offset.y = handRestingOffset * Math.cos(handDirection);

            if (limbInfo.action === LimbAction.chargeSpear) {
               limb.rotation = lerp(ITEM_RESTING_ROTATION, Math.PI / 3.5, chargeProgress) * handMult;
               itemRenderPart.offset.x = 5;
               itemRenderPart.offset.y = 11;
               itemRenderPart.rotation = 0;
            } else {
               limb.rotation = lerp(Math.PI / 4.2, Math.PI / 2.5, chargeProgress) * handMult;
               itemRenderPart.offset.x = 12;
               itemRenderPart.offset.y = 36;
               itemRenderPart.rotation = -Math.PI/6 * handMult;
            }

            if (item !== null && limbInfo.thrownBattleaxeItemID === item.id) {
               shouldShowActiveItemRenderPart = false;
            }

            limb.shakeAmount = lerp(0, 1.5, chargeProgress);
            break;
         }
         case LimbAction.craft: {
            animateLimb(limb, limbIdx, limbInfo);
            createCraftingAnimationParticles(this.entity, limbIdx);
            shouldShowActiveItemRenderPart = false;
            break;
         }
         case LimbAction.useMedicine: {
            animateLimb(limb, limbIdx, limbInfo);
            createMedicineAnimationParticles(this.entity, limbIdx);
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
         
            let eatIntervalProgress = (secondsSinceLastAction % FOOD_EAT_INTERVAL) / FOOD_EAT_INTERVAL * 2;
            if (eatIntervalProgress > 1) {
               eatIntervalProgress = 2 - eatIntervalProgress;
            }
            
            let activeItemDirection = Math.PI / 4;
            activeItemDirection -= lerp(0, Math.PI/5, eatIntervalProgress);

            const insetAmount = lerp(0, 17, eatIntervalProgress);

            const handRestingOffset = getHandRestingOffset(this.entity.type as InventoryUseEntityType);
            const handOffsetAmount = handRestingOffset - insetAmount;
            limb.offset.x = handOffsetAmount * Math.sin(activeItemDirection);
            limb.offset.y = handOffsetAmount * Math.cos(activeItemDirection);
            limb.rotation = lerp(HAND_RESTING_ROTATION, HAND_RESTING_ROTATION - Math.PI/5, eatIntervalProgress) * handMult;

            const activeItemOffsetAmount = ITEM_RESTING_OFFSET + itemSize/2 - insetAmount;
            const activeItemOffsetDirection = (activeItemDirection - Math.PI/14) * handMult;
            limb.offset.x = activeItemOffsetAmount * Math.sin(activeItemOffsetDirection);
            limb.offset.y = activeItemOffsetAmount * Math.cos(activeItemOffsetDirection);
            limb.rotation = lerp(0, -Math.PI/3, eatIntervalProgress) * handMult;
            break;
         }
         case LimbAction.none: {
            // 
            // Attack animation
            // 

            const handRestingDirection = getLimbRestingDirection(this.entity.type as InventoryUseEntityType);

            // 
            // Calculate attack progress
            // 
      
            let attackProgress = secondsSinceLastAction / limbInfo.lastAttackCooldown;
            if (attackProgress > 1) {
               attackProgress = 1;
            }

            // @Cleanup: Copy and paste
            if (item !== null && item.type === ItemType.spear) {
               let direction: number;
               let attackHandRotation: number;
               let extraOffset: number;
               if (attackProgress < SPEAR_ATTACK_LUNGE_TIME) {
                  // Lunge part of the animation
                  direction = lerp(handRestingDirection, Math.PI / 4, attackProgress / SPEAR_ATTACK_LUNGE_TIME);
                  attackHandRotation = lerp(ITEM_RESTING_ROTATION, -Math.PI / 7, attackProgress / SPEAR_ATTACK_LUNGE_TIME);
                  extraOffset = lerp(0, 7, attackProgress / SPEAR_ATTACK_LUNGE_TIME);
               } else {
                  // Return part of the animation
                  const returnProgress = (attackProgress - SPEAR_ATTACK_LUNGE_TIME) / (1 - SPEAR_ATTACK_LUNGE_TIME);
                  direction = lerp(Math.PI / 4, handRestingDirection, returnProgress);
                  attackHandRotation = lerp(-Math.PI / 7, ITEM_RESTING_ROTATION, returnProgress);
                  extraOffset = lerp(7, 0, returnProgress);
               }

               const handRestingOffset = getHandRestingOffset(this.entity.type as InventoryUseEntityType);
               const handOffsetDirection = direction * handMult;
               const handOffsetAmount = handRestingOffset + extraOffset;
               limb.offset.x = handOffsetAmount * Math.sin(handOffsetDirection);
               limb.offset.y = handOffsetAmount * Math.cos(handOffsetDirection);
               limb.rotation = attackHandRotation * handMult;
   
               itemRenderPart.offset.x = 5;
               itemRenderPart.offset.y = 11;
               itemRenderPart.rotation = 0;
            } else {
               let direction: number;
               let attackHandRotation: number;
               if (attackProgress < ATTACK_LUNGE_TIME) {
                  // Lunge part of the animation
                  direction = lerp(handRestingDirection, handRestingDirection - ITEM_SWING_RANGE, attackProgress / ATTACK_LUNGE_TIME);
                  attackHandRotation = lerp(ITEM_RESTING_ROTATION, ITEM_END_ROTATION, attackProgress / ATTACK_LUNGE_TIME);
               } else {
                  // Return part of the animation
                  const returnProgress = (attackProgress - ATTACK_LUNGE_TIME) / (1 - ATTACK_LUNGE_TIME);
                  direction = lerp(handRestingDirection - ITEM_SWING_RANGE, handRestingDirection, returnProgress);
                  attackHandRotation = lerp(ITEM_END_ROTATION, ITEM_RESTING_ROTATION, returnProgress);
               }
               
               const handRestingOffset = getHandRestingOffset(this.entity.type as InventoryUseEntityType);
               const handOffsetDirection = direction * handMult;
               limb.offset.x = handRestingOffset * Math.sin(handOffsetDirection);
               limb.offset.y = handRestingOffset * Math.cos(handOffsetDirection);
               limb.rotation = attackHandRotation * handMult;

               if (item !== null && ITEM_TYPE_RECORD[item.type] === "bow") {
                  itemRenderPart.rotation = 0;
                  itemRenderPart.offset.x = 4 * handMult;
                  itemRenderPart.offset.y = 4;
               } else if (item !== null && showLargeItemTexture(item.type)) {
                  itemRenderPart.rotation = 0;
                  itemRenderPart.offset.x = (itemSize - 8) * handMult;
                  itemRenderPart.offset.y = itemSize - 8;
               } else if (item !== null) {
                  itemRenderPart.rotation = 0;
                  itemRenderPart.offset.x = itemSize/2 * handMult;
                  itemRenderPart.offset.y = itemSize/2;
               }
            }
            break;
         }
      }

      this.updateActiveItemRenderPart(limbIdx, limbInfo, item, shouldShowActiveItemRenderPart);
   }

   public update(): void {
      for (let i = 0; i < this.useInfos.length; i++) {
         const useInfo = this.useInfos[i];
         this.updateLimb(i, useInfo);
      }
   }
   
   public updateFromData(data: InventoryUseComponentData): void {
      for (let i = 0; i < data.inventoryUseInfos.length; i++) {
         const useInfoData = data.inventoryUseInfos[i];
         const limbInfo = this.useInfos[i];
         
         limbInfo.bowCooldownTicks = useInfoData.bowCooldownTicks;
         limbInfo.selectedItemSlot = useInfoData.selectedItemSlot;
         limbInfo.bowCooldownTicks = useInfoData.bowCooldownTicks;
         limbInfo.itemAttackCooldowns = useInfoData.itemAttackCooldowns;
         limbInfo.spearWindupCooldowns = useInfoData.spearWindupCooldowns;
         limbInfo.crossbowLoadProgressRecord = useInfoData.crossbowLoadProgressRecord;
         limbInfo.foodEatingTimer = useInfoData.foodEatingTimer;
         limbInfo.action = useInfoData.action;
         limbInfo.lastAttackTicks = useInfoData.lastAttackTicks;
         limbInfo.lastEatTicks = useInfoData.lastEatTicks;
         limbInfo.lastBowChargeTicks = useInfoData.lastBowChargeTicks;
         limbInfo.lastSpearChargeTicks = useInfoData.lastSpearChargeTicks;
         limbInfo.lastBattleaxeChargeTicks = useInfoData.lastBattleaxeChargeTicks;
         limbInfo.lastCrossbowLoadTicks = useInfoData.lastCrossbowLoadTicks;
         limbInfo.lastCraftTicks = useInfoData.lastCraftTicks;
         limbInfo.thrownBattleaxeItemID = useInfoData.thrownBattleaxeItemID;
         limbInfo.lastAttackCooldown = useInfoData.lastAttackCooldown;

         // @Hack
         // Initial animation start position
         if (useInfoData.action === LimbAction.craft || useInfoData.action === LimbAction.researching) {
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
         
         this.updateLimb(i, limbInfo);
      }
   }

   public getUseInfo(inventoryName: InventoryName): LimbData {
      for (let i = 0; i < this.useInfos.length; i++) {
         const useInfo = this.useInfos[i];
         if (useInfo.inventoryName === inventoryName) {
            return useInfo;
         }
      }

      throw new Error();
   }
}

export default InventoryUseComponent;