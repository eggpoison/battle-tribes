import { BlockType, ServerComponentType } from "battletribes-shared/components";
import { DamageSource, Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { ComponentArray } from "./ComponentArray";
import { BowItemInfo, getItemAttackInfo, getItemType, HammerItemType, Inventory, InventoryName, Item, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType, itemTypeIsHammer, QUIVER_PULL_TIME_TICKS, RETURN_FROM_BOW_USE_TIME_TICKS } from "battletribes-shared/items/items";
import { Packet } from "battletribes-shared/packets";
import { getInventory, hasInventory, InventoryComponentArray } from "./InventoryComponent";
import { customTickIntervalHasPassed, lerp, Point, polarVec2, randAngle } from "battletribes-shared/utils";
import { assertBoxIsCircular, Box, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { getHitboxesByFlag, TransformComponentArray } from "./TransformComponent";
import { AttackVar, BLOCKING_LIMB_STATE, copyLimbState, LimbConfiguration, LimbState, SHIELD_BLOCKING_LIMB_STATE, RESTING_LIMB_STATES, interpolateLimbState } from "battletribes-shared/attack-patterns";
import { registerDirtyEntity, registerEntityTickEvent } from "../server/player-clients";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import Layer from "../Layer";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { createEntity, destroyEntity, entityExists, getEntityLayer, getEntityType } from "../world";
import { applyKnockback, getHitboxAngularVelocity, Hitbox, setHitboxRelativeAngle } from "../hitboxes";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { getHumanoidRadius } from "../entities/tribes/tribesman-ai/tribesman-ai-utils";
import { HitFlags } from "../../../shared/src/client-server-types";
import { AttackEffectiveness, calculateAttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { StatusEffect } from "../../../shared/src/status-effects";
import { TribesmanTitle } from "../../../shared/src/titles";
import { HitboxCollisionPair } from "../collision-detection";
import { createItemEntityConfig } from "../entities/item-entity";
import { calculateItemKnockback } from "../entities/tribes/limb-use";
import { calculateItemDamage } from "../entities/tribes/tribe-member";
import { createItem } from "../items";
import { BerryBushComponentArray } from "./BerryBushComponent";
import { BerryBushPlantedComponentArray } from "./BerryBushPlantedComponent";
import { doBlueprintWork } from "./BlueprintComponent";
import { HealthComponentArray, hitEntityWithoutDamage, damageEntity, healEntity } from "./HealthComponent";
import { applyStatusEffect } from "./StatusEffectComponent";
import { getEntityRelationship, EntityRelationship, entitiesBelongToSameTribe, TribeComponentArray } from "./TribeComponent";
import { hasTitle } from "./TribesmanComponent";
import { createHeldItemConfig } from "../entities/held-item";
import { createEntityConfigAttachInfo } from "../components";
import { _bounds } from "../../../shared/src/boxes/BaseBox";

// @Cleanup: Make into class Limb with getHeldItem method
export interface LimbInfo {
   readonly associatedInventory: Inventory;
   readonly hitbox: Hitbox;
   selectedItemSlot: number;
   readonly spearWindupCooldowns: Partial<Record<number, number>>;
   readonly crossbowLoadProgressRecord: Partial<Record<number, number>>;
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
   /** Artificial cooldown added to tribesmen to make them a bit worse at combat */
   extraAttackCooldownTicks: number;

   /** Tick timestamp when the current action was started */
   currentActionElapsedTicks: number;
   /** Expected duration of the current action in ticks */
   currentActionDurationTicks: number;
   /** Number of ticks that the current animation is being paused. */
   currentActionPauseTicksRemaining: number;
   currentActionRate: number;

   currentActionStartLimbState: LimbState;
   currentActionEndLimbState: LimbState;

   // swingAttack: Entity;
   // blockAttack: Entity;
   
   // @Hack @Memory: Shouldn't be stored like this, should only be sent when block events happen
   // @Bug: If multiple attacks are blocked in 1 tick by the same damage box, only one of them is sent. 
   lastBlockTick: number;
   blockPositionX: number;
   blockPositionY: number;
   blockType: BlockType;

   isBlocked: boolean;
   canDamage: boolean;
}

// @Copynpaste
const BOW_DRAWING_CHARGE_START_LIMB_STATE: LimbState = {
   direction: 0,
   extraOffset: 0,
   angle: 0,
   extraOffsetX: 0,
   extraOffsetY: 22
};
const BOW_DRAWING_CHARGE_END_LIMB_STATE: LimbState = {
   direction: 0,
   extraOffset: 0,
   angle: 0,
   extraOffsetX: 0,
   extraOffsetY: 8
};

export function limbHeldItemCanBeSwitched(limb: LimbInfo): boolean {
   return limb.action === LimbAction.none && limb.currentActionElapsedTicks >= limb.currentActionDurationTicks;
}

const addLimbStateToPacket = (packet: Packet, limbState: LimbState): void => {
   packet.writeNumber(limbState.direction);
   packet.writeNumber(limbState.extraOffset);
   packet.writeNumber(limbState.angle);
   packet.writeNumber(limbState.extraOffsetX);
   packet.writeNumber(limbState.extraOffsetY);
}

export class InventoryUseComponent {
   public readonly associatedInventoryNames = new Array<InventoryName>();
   
   public readonly limbInfos = new Array<LimbInfo>();
   private readonly inventoryUseInfoRecord: Partial<Record<InventoryName, LimbInfo>> = {};

   public globalAttackCooldown = 0;

   // @Hack: limb configuration. Can't be called in this function as the limbInfos array won't have been populated
   public createLimb(associatedInventory: Inventory, hitbox: Hitbox, limbConfiguration: LimbConfiguration): void {
      const restingLimbState = RESTING_LIMB_STATES[limbConfiguration];

      const useInfo: LimbInfo = {
         associatedInventory: associatedInventory,
         hitbox: hitbox,
         selectedItemSlot: 1,
         spearWindupCooldowns: {},
         crossbowLoadProgressRecord: {},
         foodEatingTimer: 0,
         action: LimbAction.none,
         lastAttackTicks: 0,
         lastEatTicks: 0,
         lastBowChargeTicks: 0,
         lastSpearChargeTicks: 0,
         lastBattleaxeChargeTicks: 0,
         lastCrossbowLoadTicks: 0,
         lastCraftTicks: 0,
         lastAttackWindupTicks: 0,
         thrownBattleaxeItemID: -1,
         lastAttackCooldown: Settings.DEFAULT_ATTACK_COOLDOWN,
         extraAttackCooldownTicks: 0,
         currentActionElapsedTicks: 0,
         currentActionDurationTicks: 0,
         currentActionPauseTicksRemaining: 0,
         currentActionRate: 1,
         currentActionStartLimbState: copyLimbState(restingLimbState),
         currentActionEndLimbState: copyLimbState(restingLimbState),
         lastBlockTick: 0,
         blockPositionX: 0,
         blockPositionY: 0,
         blockType: BlockType.toolBlock,
         isBlocked: false,
         canDamage: false
      };
      
      this.limbInfos.push(useInfo);
      this.inventoryUseInfoRecord[associatedInventory.name] = useInfo;
   }

   public getLimbInfo(inventoryName: InventoryName): LimbInfo {
      const useInfo = this.inventoryUseInfoRecord[inventoryName];

      if (typeof useInfo === "undefined") {
         throw new Error("Use info doesn't exist");
      }

      return useInfo;
   }

   public hasUseInfo(inventoryName: InventoryName): boolean {
      return typeof this.inventoryUseInfoRecord[inventoryName] !== "undefined";
   }
}

export const InventoryUseComponentArray = new ComponentArray<InventoryUseComponent>(ServerComponentType.inventoryUse, true, getDataLength, addDataToPacket);
InventoryUseComponentArray.onJoin = onJoin;
InventoryUseComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
InventoryUseComponentArray.onHitboxCollision = onHitboxCollision;

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   
   const handHitboxes = getHitboxesByFlag(transformComponent, HitboxFlag.HAND);

   for (let i = 0; i < inventoryUseComponent.associatedInventoryNames.length; i++) {
      const inventoryName = inventoryUseComponent.associatedInventoryNames[i];
      const inventory = getInventory(inventoryComponent, inventoryName);

      // @Hack?
      const handHitbox = handHitboxes[i];

      // @Hack
      const limbConfiguration = inventoryUseComponent.associatedInventoryNames.length - 1;
      inventoryUseComponent.createLimb(inventory, handHitbox, limbConfiguration);
   }
}

const currentActionHasFinished = (limbInfo: LimbInfo): boolean => {
   return limbInfo.currentActionElapsedTicks >= limbInfo.currentActionDurationTicks;
}

// @Cleanup: remove once proper method is made
// @Cleanup: also make getHeldItemAttackInfo method
export function getHeldItem(limbInfo: LimbInfo): Item | null {
   const item = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
   return (typeof item !== "undefined" && limbInfo.thrownBattleaxeItemID !== item.id) ? item : null;
}

export function getHeldItemEntity(limbInfo: LimbInfo): Entity | null {
   for (const child of limbInfo.hitbox.children) {
      if (getEntityType(child.entity) === EntityType.heldItem) {
         return child.entity;
      }
   }

   return null;
}

export function getLimbConfiguration(inventoryUseComponent: InventoryUseComponent): LimbConfiguration {
   switch (inventoryUseComponent.limbInfos.length) {
      case 1: return LimbConfiguration.singleHanded;
      case 2: return LimbConfiguration.twoHanded;
      default: throw new Error();
   }
}

export function getCurrentLimbState(limb: LimbInfo): LimbState {
   if (limb.currentActionDurationTicks === 0 || limb.currentActionElapsedTicks >= limb.currentActionDurationTicks) {
      // If the action has duration 0, assume that it is finished
      return copyLimbState(limb.currentActionEndLimbState);
   } else {
      const progress = limb.currentActionElapsedTicks / limb.currentActionDurationTicks;
      return interpolateLimbState(limb.currentActionStartLimbState, limb.currentActionEndLimbState, progress);
   }
}

const boxIsCollidingWithSubtile = (box: Box, subtileX: number, subtileY: number): boolean => {
   // @Speed
   const position = new Point((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE);
   const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
   
   return box.getCollisionResult(tileBox).isColliding;
}

const getBoxCollidingWallSubtiles = (layer: Layer, box: Box): ReadonlyArray<number> => {
   box.calculateBounds();
   const minSubtileX = Math.max(Math.floor(_bounds.minX / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxSubtileX = Math.min(Math.floor(_bounds.maxX / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   const minSubtileY = Math.max(Math.floor(_bounds.minY / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxSubtileY = Math.min(Math.floor(_bounds.maxY / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);

   const collidingWallSubtiles = new Array<number>();
   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         if (layer.subtileIsWall(subtileIndex) && boxIsCollidingWithSubtile(box, subtileX, subtileY)) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            collidingWallSubtiles.push(subtileIndex);
         }
      }
   }
   return collidingWallSubtiles;
}

const getLimbActionProgress = (limb: LimbInfo): number => {
   if (limb.currentActionDurationTicks <= 0 || limb.currentActionElapsedTicks > limb.currentActionDurationTicks) {
      return 1;
   }

   return limb.currentActionElapsedTicks / limb.currentActionDurationTicks;
}

export function getLimbStateOffset(limbState: LimbState, humanoidRadius: number): Point {
   const offset = limbState.extraOffset + humanoidRadius + 2;

   const offsetX = offset * Math.sin(limbState.direction) + limbState.extraOffsetX;
   const offsetY = offset * Math.cos(limbState.direction) + limbState.extraOffsetY;
   return new Point(offsetX, offsetY);
}

const updateHandHitboxToLimbInfo = (handHitbox: Hitbox, limb: LimbInfo): void => {
   const transformComponent = TransformComponentArray.getComponent(handHitbox.entity);
   const limbOffset = getLimbStateOffset(getCurrentLimbState(limb), getHumanoidRadius(transformComponent));
   handHitbox.box.offset.x = limbOffset.x;
   handHitbox.box.offset.y = limbOffset.y;

   transformComponent.isDirty = true;
   
   const progress = getLimbActionProgress(limb);
   setHitboxRelativeAngle(handHitbox, lerp(limb.currentActionStartLimbState.angle, limb.currentActionEndLimbState.angle, progress));
}

function onTick(entity: Entity): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      inventoryUseComponent.globalAttackCooldown--;
   }

   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limb = inventoryUseComponent.limbInfos[i];

      const heldItem = getHeldItem(limb);

      const heldItemEntity = getHeldItemEntity(limb);
      if (heldItem !== null && heldItemEntity === null) {
         const config = createHeldItemConfig(limb.hitbox, heldItem.type);
         createEntity(config, getEntityLayer(entity), 0);
      } else if (heldItem === null && heldItemEntity !== null) {
         destroyEntity(heldItemEntity);
      }
      
      // @Cleanup @Bandwidth: When blocking, once the block is finished going up the entity should no longer be dirtied by this
      // Certain actions should always show an update for the player
      if (limb.action !== LimbAction.none) {
         registerDirtyEntity(entity);
      }

      // @Hack
      if (limb.action === LimbAction.eat && customTickIntervalHasPassed(limb.currentActionElapsedTicks, 0.19)) {
         const event: EntityTickEvent = {
            entityID: entity,
            type: EntityTickEventType.foodMunch,
            data: 0
         };
         registerEntityTickEvent(entity, event);
      }

      if (limb.currentActionPauseTicksRemaining > 0) {
         limb.currentActionPauseTicksRemaining--;
      } else if (limb.currentActionElapsedTicks < limb.currentActionDurationTicks) {
         limb.currentActionElapsedTicks += limb.currentActionRate;
      }

      if (currentActionHasFinished(limb)) {
         switch (limb.action) {
            case LimbAction.engageBlock: {
               limb.action = LimbAction.block;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = 0;
                  
               break;
            }
            case LimbAction.windShieldBash: {
               limb.action = LimbAction.pushShieldBash;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = AttackVar.SHIELD_BASH_PUSH_TIME_TICKS;

               // Push forwards
               const transformComponent = TransformComponentArray.getComponent(entity);
               const entityHitbox = transformComponent.hitboxes[0];
               
               applyKnockback(entityHitbox, polarVec2(250, entityHitbox.box.angle));

               // @Incomplete
               
               // const blockAttack = createBlockAttackConfig(entity, limb);
               // createEntity(blockAttack, getEntityLayer(entity), 0);

               // limb.blockBox.isActive = false;
               
               // limb.limbDamageBox.isActive = true;
               // limb.limbDamageBox.isBlocked = false;
               // limb.heldItemDamageBox.isActive = true;
               // limb.heldItemDamageBox.isBlocked = false;

               // const damageBoxInfo = SHIELD_BLOCKING_DAMAGE_BOX_INFO;

               // // @Copynpaste
               // assertBoxIsRectangular(limb.heldItemDamageBox.box);
               // limb.heldItemDamageBox.box.offset.x = damageBoxInfo.offsetX * (isFlipped ? -1 : 1);
               // limb.heldItemDamageBox.box.offset.y = damageBoxInfo.offsetY;
               // limb.heldItemDamageBox.box.width = damageBoxInfo.width;
               // limb.heldItemDamageBox.box.height = damageBoxInfo.height;
               // limb.heldItemDamageBox.box.relativeAngle = damageBoxInfo.angle * (isFlipped ? -1 : 1);
               break;
            }
            case LimbAction.pushShieldBash: {
               limb.action = LimbAction.returnShieldBashToRest;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = AttackVar.SHIELD_BASH_RETURN_TIME_TICKS;

               // limb.limbDamageBox.isActive = false;
               // limb.heldItemDamageBox.isActive = false;
               break;
            }
            case LimbAction.returnShieldBashToRest: {
               limb.action = LimbAction.block;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = 0;
               break;
            }
            case LimbAction.windAttack: {
               const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);

               const attackPattern = heldItemAttackInfo.attackPatterns![getLimbConfiguration(inventoryUseComponent)];
               
               limb.action = LimbAction.attack;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.swingTimeTicks;
               // @Speed: Garbage collection
               limb.currentActionStartLimbState = copyLimbState(attackPattern.windedBack);
               // @Speed: Garbage collection
               limb.currentActionEndLimbState = copyLimbState(attackPattern.swung);

               limb.canDamage = true;
               break;
            }
            case LimbAction.attack: {
               const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
            
               const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
               const attackPattern = heldItemAttackInfo.attackPatterns![limbConfiguration];
            
               limb.action = LimbAction.returnAttackToRest;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.returnTimeTicks;
               // @Bug: shouldn't it copy the current state?
               // @Speed: Garbage collection
               limb.currentActionStartLimbState = copyLimbState(attackPattern.swung);
               // @Speed: Garbage collection
               limb.currentActionEndLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
            
               // If the swing hits something partway through it can be destroyed
               limb.canDamage = false;
               break;
            }
            case LimbAction.returnAttackToRest: {
               const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);

               const limbConfiguration = getLimbConfiguration(inventoryUseComponent);

               limb.action = LimbAction.none;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.restTimeTicks;
               limb.currentActionStartLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
               limb.currentActionEndLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
               break;
            }
            case LimbAction.returnBlockToRest: {
               limb.action = LimbAction.none;
               break;
            }
            // If finished moving limb to quiver, move from quiver to charge start limbstate
            case LimbAction.moveLimbToQuiver: {
               const startLimbState = getCurrentLimbState(limb);
         
               limb.action = LimbAction.moveLimbFromQuiver;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = QUIVER_PULL_TIME_TICKS;
               limb.currentActionStartLimbState = startLimbState;
               limb.currentActionEndLimbState = BOW_DRAWING_CHARGE_START_LIMB_STATE;
               break;
            }
            // If finished moving limb from quiver, start charging bow
            case LimbAction.moveLimbFromQuiver: {
               const startLimbState = getCurrentLimbState(limb);
               // @Hack
               const itemInfo = ITEM_INFO_RECORD[ItemType.wooden_bow] as BowItemInfo;
               
               limb.action = LimbAction.pullBackArrow;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = itemInfo.shotChargeTimeTicks;
               limb.currentActionStartLimbState = startLimbState;
               limb.currentActionEndLimbState = BOW_DRAWING_CHARGE_END_LIMB_STATE;
               
               const otherInventoryName = i === 0 ? InventoryName.offhand : InventoryName.hotbar;
               const otherLimb = inventoryUseComponent.getLimbInfo(otherInventoryName);
               const otherLimbStartState = getCurrentLimbState(otherLimb);
               
               otherLimb.action = LimbAction.chargeBow;
               otherLimb.currentActionElapsedTicks = 0;
               otherLimb.currentActionDurationTicks = itemInfo.shotChargeTimeTicks;
               // Don't move the limb
               otherLimb.currentActionStartLimbState = otherLimbStartState;
               otherLimb.currentActionEndLimbState = otherLimbStartState;
               break;
            }
            // If finished resting after arrow release, return to default state
            case LimbAction.arrowReleased:
            case LimbAction.mainArrowReleased: {
               const startingLimbState = getCurrentLimbState(limb);
               const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
               
               limb.action = LimbAction.returnFromBow;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = RETURN_FROM_BOW_USE_TIME_TICKS;
               limb.currentActionStartLimbState = copyLimbState(startingLimbState);
               limb.currentActionEndLimbState = RESTING_LIMB_STATES[limbConfiguration];
               break;
            }
            case LimbAction.returnFromBow: {
               const startingLimbState = getCurrentLimbState(limb);
               const limbConfiguration = getLimbConfiguration(inventoryUseComponent);

               limb.action = LimbAction.none;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = 0;
               limb.currentActionStartLimbState = copyLimbState(startingLimbState);
               limb.currentActionEndLimbState = RESTING_LIMB_STATES[limbConfiguration];
               break;
            }
         }
      }

      // @Temporary? why did i comment this out
      // If the attack collides with a wall, cancel it
      // if (limb.action === LimbAction.attack) {
      //    const layer = getEntityLayer(entity);
         
      //    if (limb.heldItemDamageBox.isActive) {
      //       const heldItemCollidingSubtiles = getBoxCollidingWallSubtiles(layer, limb.heldItemDamageBox.box);
      //       if (heldItemCollidingSubtiles.length > 0) {
      //          cancelAttack(limb);
      //          limb.heldItemDamageBox.isBlockedByWall = true;
      //          limb.heldItemDamageBox.blockingSubtileIndex = heldItemCollidingSubtiles[0];

      //          // Damage the subtiles with the pickaxe
      //          if (ITEM_TYPE_RECORD[heldItem.type] === "pickaxe") {
      //             const itemInfo = ITEM_INFO_RECORD[heldItem.type] as PickaxeItemInfo;

      //             for (let i = 0; i < heldItemCollidingSubtiles.length; i++) {
      //                if (limb.heldItemDamageBox.wallSubtileDamageGiven >= itemInfo.wallDamage) {
      //                   break;
      //                }
                     
      //                const subtileIndex = heldItemCollidingSubtiles[i];
      //                const damageDealt = damageWallSubtitle(layer, subtileIndex, itemInfo.wallDamage);

      //                limb.heldItemDamageBox.wallSubtileDamageGiven += damageDealt;
      //             }
      //          }
      //       }
      //    } else if (limb.limbDamageBox.isActive) {
      //       const limbCollidingSubtiles = getBoxCollidingWallSubtiles(layer, limb.limbDamageBox.box);
      //       if (limbCollidingSubtiles.length > 0) {
      //          cancelAttack(limb);
      //          limb.limbDamageBox.isBlockedByWall = true;
      //          limb.limbDamageBox.blockingSubtileIndex = limbCollidingSubtiles[0];
      //       }
      //    }
      // }
      // @Copynpaste
      // Update damage box for shield bashes
      if (limb.action === LimbAction.pushShieldBash) {
         const swingProgress = limb.currentActionElapsedTicks / limb.currentActionDurationTicks;
         // @Incomplete
         // lerpLimbBetweenStates(entity, limb, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BASH_PUSHED_LIMB_STATE, swingProgress, isFlipped);
      }

      // Update blocking damage box when blocking
      if (limb.action === LimbAction.block) {
         if (limb.currentActionElapsedTicks >= limb.currentActionDurationTicks) {
            const blockingState = heldItem !== null && ITEM_TYPE_RECORD[heldItem.type] === "shield" ? SHIELD_BLOCKING_LIMB_STATE : BLOCKING_LIMB_STATE;
            // @Incomplete
            // setHitboxToState(entity, limb, blockingState, isFlipped);
         }
      }

      // @Incomplete
      // if (limbInfo.itemAttackCooldowns[limbInfo.selectedItemSlot] === undefined && limbInfo.extraAttackCooldownTicks > 0) {
      //    limbInfo.extraAttackCooldownTicks--;
      // }

      updateHandHitboxToLimbInfo(limb.hitbox, limb);
   }
}

export function getCrossbowLoadProgressRecordLength(useInfo: LimbInfo): number {
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * Object.keys(useInfo.crossbowLoadProgressRecord).length;
   return lengthBytes;
}

export function addCrossbowLoadProgressRecordToPacket(packet: Packet, useInfo: LimbInfo): void {
   // @Copynpaste
   const crossbowLoadProgressEntries = Object.entries(useInfo.crossbowLoadProgressRecord).map(([a, b]) => [Number(a), b]) as Array<[number, number]>;
   packet.writeNumber(crossbowLoadProgressEntries.length);
   for (let i = 0; i < crossbowLoadProgressEntries.length; i++) {
      const [itemSlot, cooldown] = crossbowLoadProgressEntries[i];
      packet.writeNumber(itemSlot);
      packet.writeNumber(cooldown);
   }
}

function getDataLength(entity: Entity): number {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   for (const useInfo of inventoryUseComponent.limbInfos) {
      lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * Object.keys(useInfo.spearWindupCooldowns).length;
      lengthBytes += getCrossbowLoadProgressRecordLength(useInfo);
      lengthBytes += 20 * Float32Array.BYTES_PER_ELEMENT;
      // Limb states
      lengthBytes += 2 * 5 * Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   packet.writeNumber(inventoryUseComponent.limbInfos.length);
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limb = inventoryUseComponent.limbInfos[i];

      packet.writeNumber(limb.associatedInventory.name);
      packet.writeNumber(limb.selectedItemSlot);
      const heldItem = getHeldItem(limb);
      packet.writeNumber(heldItem !== null ? heldItem.type : -1);

      // @Cleanup: Copy and paste
      const spearWindupCooldownEntries = Object.entries(limb.spearWindupCooldowns).map(([a, b]) => [Number(a), b]) as Array<[number, number]>;
      packet.writeNumber(spearWindupCooldownEntries.length);
      for (let i = 0; i < spearWindupCooldownEntries.length; i++) {
         const [itemSlot, cooldown] = spearWindupCooldownEntries[i];
         packet.writeNumber(itemSlot);
         packet.writeNumber(cooldown);
      }

      addCrossbowLoadProgressRecordToPacket(packet, limb);

      packet.writeNumber(limb.foodEatingTimer);
      packet.writeNumber(limb.action);
      packet.writeNumber(limb.lastAttackTicks);
      packet.writeNumber(limb.lastEatTicks);
      packet.writeNumber(limb.lastBowChargeTicks);
      packet.writeNumber(limb.lastSpearChargeTicks);
      packet.writeNumber(limb.lastBattleaxeChargeTicks);
      packet.writeNumber(limb.lastCrossbowLoadTicks);
      packet.writeNumber(limb.lastCraftTicks);
      packet.writeNumber(limb.thrownBattleaxeItemID);
      packet.writeNumber(limb.lastAttackCooldown);
      packet.writeNumber(limb.currentActionElapsedTicks);
      packet.writeNumber(limb.currentActionDurationTicks);
      packet.writeNumber(limb.currentActionPauseTicksRemaining);
      packet.writeNumber(limb.currentActionRate);
      const heldItemEntity = getHeldItemEntity(limb);
      packet.writeNumber(heldItemEntity !== null ? heldItemEntity : 0);
      packet.writeNumber(limb.lastBlockTick);
      packet.writeNumber(limb.blockPositionX);
      packet.writeNumber(limb.blockPositionY);
      packet.writeNumber(limb.blockType);

      addLimbStateToPacket(packet, limb.currentActionStartLimbState);
      addLimbStateToPacket(packet, limb.currentActionEndLimbState);
   }
}

// @Cleanup: this shit is ASS. Kill it all
export function setLimbActions(inventoryUseComponent: InventoryUseComponent, limbAction: LimbAction): void {
   // for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
   //    const limbInfo = inventoryUseComponent.limbInfos[i];
   //    limbInfo.action = limbAction;
   // }
}

const shouldRepairBuilding = (entity: Entity, comparingEntity: Entity): boolean => {
   if (getEntityRelationship(entity, comparingEntity) !== EntityRelationship.friendlyBuilding) {
      return false;
   }

   if (!entitiesBelongToSameTribe(entity, comparingEntity)) {
      return false;
   }

   const healthComponent = HealthComponentArray.getComponent(comparingEntity);
   return healthComponent.health < healthComponent.maxHealth;
}

const getRepairAmount = (tribeMember: Entity, itemType: HammerItemType): number => {
   const itemInfo = ITEM_INFO_RECORD[itemType];
   let repairAmount = itemInfo.repairAmount;

   if (hasTitle(tribeMember, TribesmanTitle.builder)) {
      repairAmount *= 1.5;
   }
   
   return Math.round(repairAmount);
}

const isBerryBushWithBerries = (entity: Entity): boolean => {
   switch (getEntityType(entity)) {
      case EntityType.berryBush: {
         const berryBushComponent = BerryBushComponentArray.getComponent(entity);
         return berryBushComponent.numBerries > 0;
      }
      case EntityType.berryBushPlanted: {
         const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);
         return berryBushPlantedComponent.numFruit > 0;
      }
      default: {
         return false;
      }
   }
}

const getPlantGatherAmount = (tribeman: Entity, plant: Entity, gloves: Item | null): number => {
   let amount = 1;

   const entityType = getEntityType(plant);
   if (hasTitle(tribeman, TribesmanTitle.berrymuncher) && (entityType === EntityType.berryBush || entityType === EntityType.berryBushPlanted)) {
      if (Math.random() < 0.3) {
         amount++;
      }
   }

   if (hasTitle(tribeman, TribesmanTitle.gardener)) {
      if (Math.random() < 0.3) {
         amount++;
      }
   }

   if (gloves !== null && gloves.type === ItemType.gardening_gloves) {
      if (Math.random() < 0.2) {
         amount++;
      }
   }

   return amount;
}

const gatherPlant = (plant: Entity, attacker: Entity, hitHitbox: Hitbox, gloves: Item | null): void => {
   const plantTransformComponent = TransformComponentArray.getComponent(plant);
   const plantHitbox = plantTransformComponent.hitboxes[0];
   
   if (isBerryBushWithBerries(plant)) {
      const gatherMultiplier = getPlantGatherAmount(attacker, plant, gloves);

      // As hitting the bush will drop a berry regardless, only drop extra ones here
      for (let i = 0; i < gatherMultiplier - 1; i++) {
         // @HACK: hit position
         hitEntityWithoutDamage(plant, hitHitbox, attacker, new Point(0, 0));
      }
   } else {
      assertBoxIsCircular(plantHitbox.box);
      const plantRadius = plantHitbox.box.radius;

      const offsetDirection = randAngle();
      const x = plantHitbox.box.position.x + (plantRadius - 7) * Math.sin(offsetDirection);
      const y = plantHitbox.box.position.y + (plantRadius - 7) * Math.cos(offsetDirection);
   
      const config = createItemEntityConfig(new Point(x, y), randAngle(), createItem(ItemType.leaf, 1, "", ""), null);
      createEntity(config, getEntityLayer(plant), 0);

      hitEntityWithoutDamage(plant, hitHitbox, attacker, new Point(0, 0));
   }

   // @Hack
   // const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
   // const collisionPoint = new Point((plantHitbox.box.position.x + attackerTransformComponent.position.x) / 2, (plantHitbox.box.position.y + attackerTransformComponent.position.y) / 2);
   // @HACK
   const collisionPoint = new Point(0, 0);

   damageEntity(plantHitbox, attacker, 0, 0, AttackEffectiveness.ineffective, collisionPoint, HitFlags.NON_DAMAGING_HIT);
}

const damageEntityFromSwing = (attacker: Entity, limb: LimbInfo, itemType: ItemType | null, victim: Entity, hitbox: Hitbox, victimHitbox: Hitbox, collisionPoint: Point): boolean => {
   const targetEntityType = getEntityType(victim);

   const attackEffectiveness = calculateAttackEffectiveness(itemType, targetEntityType);

   // Harvest leaves from trees and berries when wearing the gathering or gardening gloves
   if ((itemType === null || itemType === ItemType.leaf) && (targetEntityType === EntityType.tree || targetEntityType === EntityType.berryBush || targetEntityType === EntityType.treePlanted || targetEntityType === EntityType.berryBushPlanted)) {
      const inventoryComponent = InventoryComponentArray.getComponent(attacker);
      if (hasInventory(inventoryComponent, InventoryName.gloveSlot)) {
         const gloveInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
         const gloves = gloveInventory.itemSlots[1];
         if (typeof gloves !== "undefined" && (gloves.type === ItemType.gathering_gloves || gloves.type === ItemType.gardening_gloves)) {
            gatherPlant(victim, attacker, victimHitbox, gloves);
            return true;
         }
      }
   }

   const attackDamage = calculateItemDamage(attacker, itemType, attackEffectiveness, limb.isBlocked);
   const attackKnockback = calculateItemKnockback(itemType, limb.isBlocked);

   const hitDirection = hitbox.box.position.angleTo(victimHitbox.box.position);

   // Register the hit
   const hitFlags = itemType !== null && itemType === ItemType.flesh_sword ? HitFlags.HIT_BY_FLESH_SWORD : 0; // @HACK
   damageEntity(victimHitbox, attacker, attackDamage, DamageSource.tribeMember, attackEffectiveness, collisionPoint, hitFlags);
   // @SQUEAM
   if (getEntityType(victimHitbox.entity) === EntityType.tukmokTailClub || victimHitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_MEDIUM) || victimHitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_BIG) || victimHitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_SMALL)) {

   } else {
      applyKnockback(victimHitbox, polarVec2(attackKnockback, hitDirection));
   }

   if (itemType !== null) {
      // @HACK: shouldn't be hard-coded here!!
      switch (itemType) {
         case ItemType.flesh_sword: {
            applyStatusEffect(victim, StatusEffect.poisoned, 3 * Settings.TICK_RATE);
            break;
         }
         case ItemType.inguSerpentTooth:
         case ItemType.iceWringer: {
            applyStatusEffect(victim, StatusEffect.freezing, 3 * Settings.TICK_RATE);
            break;
         }
      }
   }

   // Bloodaxes have a 20% chance to inflict bleeding on hit
   if (hasTitle(attacker, TribesmanTitle.bloodaxe) && Math.random() < 0.2) {
      applyStatusEffect(victim, StatusEffect.bleeding, 2 * Settings.TICK_RATE);
   }

   return true;
}

// @HACK: used in two components at once, which is why it's exported!!!
export function onSwingEntityCollision(attacker: Entity, hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point, limb: LimbInfo, itemType: ItemType | null): void {
   if (!limb.canDamage) {
      return;
   }

   // @Temporary: remove when bug is fixed
   if (!entityExists(attacker)) {
      // @TEMPORARY
      // console.warn("OUSEOFJHOSJFOISDJF bad")
      return;
   }
   // @Temporary: remove when bug is fixed
   // @Bug: Happens when a zombie swings !!!
   if (!TribeComponentArray.hasComponent(attacker)) {
      // @TEMPORARY
      // console.log(getEntityType(owner));
      // console.warn(getEntityType(owner));
      return;
   }

   const collidingEntity = collidingHitbox.entity;
   
   // Build blueprints and repair buildings
   if (itemType !== null && itemTypeIsHammer(itemType)) {
      if (getEntityType(collidingEntity) === EntityType.blueprintEntity) {
         if (entitiesBelongToSameTribe(attacker, collidingEntity)) {
            doBlueprintWork(collidingEntity, itemType);
            limb.canDamage = false;
            return;
         }
      } else if (shouldRepairBuilding(attacker, collidingEntity)) {
         const repairAmount = getRepairAmount(attacker, itemType);
         healEntity(collidingEntity, repairAmount, attacker);
         limb.canDamage = false;
         return;
      }
   }

   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Don't attack friendlies
   const relationship = getEntityRelationship(attacker, collidingEntity);
   if (relationship === EntityRelationship.friendly) {
      return;
   }

   damageEntityFromSwing(attacker, limb, itemType, collidingEntity, hitbox, collidingHitbox, collisionPoint);
   limb.canDamage = false;
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point) {
   if (!hitbox.flags.includes(HitboxFlag.HAND)) {
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(hitbox.entity);
   const inventoryName = hitbox.box.flipX ? InventoryName.offhand : InventoryName.hotbar;
   const limb = inventoryUseComponent.getLimbInfo(inventoryName);
   
   onSwingEntityCollision(hitbox.entity, hitbox, collidingHitbox, collisionPoint, limb, null);
}