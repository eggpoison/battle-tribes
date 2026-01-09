import { TribesmanAIType } from "battletribes-shared/components";
import { Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { Settings, PathfindingSettings } from "battletribes-shared/settings";
import { Point, angleToPoint, assert, distance, polarVec2, secondsToTicks } from "battletribes-shared/utils";
import { getDistanceFromPointToEntity, entityIsInLineOfSight, willStopAtDesiredDistance } from "../../../ai-shared";
import { InventoryComponentArray, countItemType, getInventory } from "../../../components/InventoryComponent";
import { getCurrentLimbState, getLimbConfiguration, InventoryUseComponentArray, limbHeldItemCanBeSwitched, setLimbActions } from "../../../components/InventoryUseComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { calculateItemDamage, useItem } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { EntityRelationship, getEntityRelationship, TribeComponentArray } from "../../../components/TribeComponent";
import { calculateAttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { getBestHammerItemSlot, getTribesmanDesiredAttackRange, getHumanoidRadius, getTribesmanSlowAcceleration, getTribesmanAcceleration, clearTribesmanPath } from "./tribesman-ai-utils";
import { attemptToRepairBuildings } from "./tribesman-structures";
import { InventoryName, ITEM_TYPE_RECORD, getItemAttackInfo, Item, ITEM_INFO_RECORD, itemInfoIsBow, QUIVER_ACCESS_TIME_TICKS, QUIVER_PULL_TIME_TICKS, ARROW_RELEASE_WAIT_TIME_TICKS, ItemType, RETURN_FROM_BOW_USE_TIME_TICKS } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { getEntityAgeTicks, getEntityLayer, getEntityType, getGameTicks } from "../../../world";
import { beginSwing } from "../limb-use";
import { TribeType } from "../../../../../shared/src/tribes";
import { applyAccelerationFromGround, turnHitboxToAngle } from "../../../hitboxes";
import { clearPathfinding, pathfindTribesman, pathToEntityExists } from "../../../components/AIPathfindingComponent";
import { BLOCKING_LIMB_STATE, copyLimbState, LimbState, QUIVER_PULL_LIMB_STATE, RESTING_LIMB_STATES, SHIELD_BLOCKING_LIMB_STATE } from "../../../../../shared/src/attack-patterns";
import { AIHelperComponent, AIHelperComponentArray } from "../../../components/AIHelperComponent";

const enum Vars {
   BOW_LINE_OF_SIGHT_WAIT_TIME = 0.5 * Settings.TICK_RATE,
   EMBRASURE_USE_RADIUS = 40,
   BATTLEAXE_MIN_USE_RANGE = 120,
   BATTLEAXE_IDEAL_USE_RANGE = 260,
   BATTLEAXE_MAX_USE_RANGE = 400,
   DESIRED_RANGED_ATTACK_DISTANCE = 360
}

// @Incomplete?
const EXTRA_BOW_COOLDOWNS: Partial<Record<EntityType, number>> = {
   [EntityType.tribeWorker]: secondsToTicks(0.3),
   [EntityType.tribeWarrior]: secondsToTicks(0.1)
};

// @Copynpaste
const BOW_HOLDING_LIMB_STATE: LimbState = {
   direction: 0,
   extraOffset: 36,
   angle: -Math.PI * 0.4,
   extraOffsetX: 4,
   extraOffsetY: 0
};

export function doMeleeAttack(tribesman: Entity, itemSlot: number): void {
   beginSwing(tribesman, itemSlot, InventoryName.hotbar);

   // Barbarians can attack with offhand
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
      beginSwing(tribesman, 1, InventoryName.offhand);
   }
}

const getItemAttackExecuteTimeSeconds = (item: Item): number => {
   const attackInfo = getItemAttackInfo(item.type);
   const timings = attackInfo.attackTimings;
   return (timings.windupTimeTicks + timings.swingTimeTicks + timings.returnTimeTicks) * Settings.DT_S;
}

export function entityHasWeapon(tribesman: Entity): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   for (const item of hotbarInventory.items) {
      const itemCategory = ITEM_TYPE_RECORD[item.type];
      if (itemCategory === "sword" || itemCategory === "spear") {
         return true;
      }
   }

   return false;
}

const getMostDamagingItemSlot = (tribesman: Entity, huntedEntity: Entity): number => {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   // @Incomplete: Account for status effects
   
   let bestItemSlot = 1;
   let mostDps = 0;
   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      const item = hotbarInventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         if (mostDps < 1 / Settings.DEFAULT_ATTACK_COOLDOWN) {
            mostDps = 1 / Settings.DEFAULT_ATTACK_COOLDOWN;
            bestItemSlot = itemSlot;
         }
         continue;
      }

      const attackEffectiveness = calculateAttackEffectiveness(item.type, getEntityType(huntedEntity));
      
      const attackExecuteTimeSeconds = getItemAttackExecuteTimeSeconds(item);
      const damage = calculateItemDamage(tribesman, item.type, attackEffectiveness, false);
      const dps = damage / attackExecuteTimeSeconds;

      if (dps > mostDps) {
         mostDps = dps;
         bestItemSlot = itemSlot;
      }
   }

   return bestItemSlot;
}

// @Copynpaste
const getBestBowItemSlot = (tribesman: Entity): number | null => {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   // @Hack!
   if (countItemType(inventoryComponent, ItemType.woodenArrow) === 0) {
      return null;
   }

   let bestItemSlot: number | null = null;
   let mostDamage = 0;
   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      const item = hotbarInventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         continue;
      }
      const itemInfo = ITEM_INFO_RECORD[item.type];
      if (!itemInfoIsBow(item.type, itemInfo)) {
         continue;
      }

      const damage = itemInfo.projectileDamage;

      if (damage > mostDamage) {
         mostDamage = damage;
         bestItemSlot = itemSlot;
      }
   }

   return bestItemSlot;
}

const getNearbyEmbrasureUsePoints = (tribesman: Entity): ReadonlyArray<Point> => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(tribesman);
   
   // Add 30 to the range to account for the fact that use points are disconnected from the embrasure positions
   const minChunkX = Math.max(Math.floor((tribesmanHitbox.box.position.x - (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((tribesmanHitbox.box.position.x + (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   const minChunkY = Math.max(Math.floor((tribesmanHitbox.box.position.y - (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((tribesmanHitbox.box.position.y + (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);

   const usePoints = new Array<Point>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (getEntityType(entity) !== EntityType.embrasure) {
               continue;
            }

            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = entityTransformComponent.hitboxes[0];

            const usePointX = entityHitbox.box.position.x - 22 * Math.sin(entityHitbox.box.angle);
            const usePointY = entityHitbox.box.position.y - 22 * Math.cos(entityHitbox.box.angle);

            if (distance(tribesmanHitbox.box.position.x, tribesmanHitbox.box.position.y, usePointX, usePointY) <= Vars.EMBRASURE_USE_RADIUS) {
               usePoints.push(new Point(usePointX, usePointY));
            }
         }
      }
   }

   return usePoints;
}

const getClosestEmbrasureUsePoint = (tribesman: Entity, usePoints: ReadonlyArray<Point>): Point => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestPoint!: Point;
   for (let i = 0; i < usePoints.length; i++) {
      const point = usePoints[i];

      const dist = tribesmanHitbox.box.position.distanceTo(point);
      if (dist < minDist) {
         minDist = dist;
         closestPoint = point;
      }
   }

   return closestPoint;
}

/** Returns a direction representing the rough direction of where nearby friendlies are */
const getFriendlyProximityDirection = (tribesman: Entity, aiHelperComponent: AIHelperComponent): number | null => {
   const dir = new Point(0, 0);

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];

   for (const friendly of aiHelperComponent.visibleEntities) {
      if (getEntityRelationship(tribesman, friendly) !== EntityRelationship.friendly) {
         continue;
      }

      const friendlyTransformComponent = TransformComponentArray.getComponent(friendly);
      const friendlyHitbox = friendlyTransformComponent.hitboxes[0];
      
      const dist = tribesmanHitbox.box.position.distanceTo(friendlyHitbox.box.position);
      if (dist === 0) {
         continue;
      }

      dir.x += (friendlyHitbox.box.position.x - tribesmanHitbox.box.position.x) / dist;
      dir.y += (friendlyHitbox.box.position.y - tribesmanHitbox.box.position.y) / dist;
   }

   if (dir.x === 0 && dir.y === 0) {
      return null;
   } else {
      // @Speed
      return new Point(0, 0).angleTo(dir);
   }
}

const adjustMoveDirectionForFriendlyProximity = (tribesman: Entity, rawMoveDirection: number): number => {
   const moveVec = angleToPoint(rawMoveDirection);
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);
   const proximityDirection = getFriendlyProximityDirection(tribesman, aiHelperComponent);
   if (proximityDirection !== null) {
      moveVec.add(angleToPoint(proximityDirection));
   }

   // @Speed @Cleanup
   const moveDirection = new Point(0, 0).angleTo(moveVec);
   return moveDirection;
}

export function goKillEntity(tribesman: Entity, huntedEntity: Entity, isAggressive: boolean): void {
   // @Cleanup: Refactor to not be so big
   
   // @Incomplete: Only accounts for hotbar

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);

   const huntedEntityTransformComponent = TransformComponentArray.getComponent(huntedEntity);
   const huntedHitbox = huntedEntityTransformComponent.hitboxes[0];
   
   let mostDamagingItemSlot = getMostDamagingItemSlot(tribesman, huntedEntity);
   
   // @Incomplete: switch to melee weapon when the target is too close
   // If the tribesman has a bow, use it
   const bowItemSlot = getBestBowItemSlot(tribesman);
   if (bowItemSlot) {
      mostDamagingItemSlot = bowItemSlot;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   const hotbarLimb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);

   // Select the item slot
   if (hotbarLimb.selectedItemSlot !== mostDamagingItemSlot && limbHeldItemCanBeSwitched(hotbarLimb)) {
      hotbarLimb.selectedItemSlot = mostDamagingItemSlot;
   }

   const hotbar = getInventory(inventoryComponent, InventoryName.hotbar);
   if (hotbar.hasItem(mostDamagingItemSlot) && hotbarLimb.selectedItemSlot === mostDamagingItemSlot) {
      const selectedItem = hotbar.itemSlots[hotbarLimb.selectedItemSlot]!;
      const weaponCategory = ITEM_TYPE_RECORD[selectedItem.type];

      // Throw spears if there is multiple
      if (weaponCategory === "spear" && selectedItem.count > 1) {
         // Rotate to face the target
         const targetDir = tribesmanHitbox.box.position.angleTo(huntedHitbox.box.position);
         turnHitboxToAngle(tribesmanHitbox, targetDir, TRIBESMAN_TURN_SPEED, 0.5, false);

         const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, huntedEntityTransformComponent) - getHumanoidRadius(transformComponent);
         if (distance > 250) {
            // Move closer
            const acceleration = getTribesmanSlowAcceleration(tribesman);
            applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, targetDir));
         } else if (distance <= 150) {
            // Backpedal away from the entity if too close
            const acceleration = getTribesmanSlowAcceleration(tribesman);
            applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, targetDir + Math.PI));
         }

         if (hotbarLimb.action !== LimbAction.chargeSpear) {
            hotbarLimb.lastSpearChargeTicks = getGameTicks();
         }
         
         const ticksSinceLastAction = getGameTicks() - hotbarLimb.lastSpearChargeTicks;
         if (ticksSinceLastAction >= 3 * Settings.TICK_RATE) {
            // Throw spear
            useItem(tribesman, selectedItem, InventoryName.hotbar, hotbarLimb.selectedItemSlot);
            setLimbActions(inventoryUseComponent, LimbAction.none);
         } else {
            // Charge spear
            hotbarLimb.action = LimbAction.chargeSpear;
         }

         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         tribesmanComponent.currentAIType = TribesmanAIType.attacking;
         return;
      }
      
      // Don't do a melee attack if using a bow, instead charge the bow
      if (weaponCategory === "bow") {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         tribesmanComponent.currentAIType = TribesmanAIType.attacking;

         const tribeComponent = TribeComponentArray.getComponent(tribesman);
         
         const isInLineOfSight = entityIsInLineOfSight(tribesmanHitbox.box.position, huntedEntity, tribesman, tribeComponent.tribe.pathfindingGroupID);
         if (isInLineOfSight) {
            tribesmanComponent.lastEnemyLineOfSightTicks = getGameTicks();
         }

         let muchTooCloseDistance: number;
         if (getEntityType(huntedEntity) === EntityType.okren) {
            muchTooCloseDistance = 180;
         } else {
            muchTooCloseDistance = 0;
         }
         
         if (isInLineOfSight || (getGameTicks() - tribesmanComponent.lastEnemyLineOfSightTicks) <= Vars.BOW_LINE_OF_SIGHT_WAIT_TIME) {
            const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, huntedEntityTransformComponent) - getHumanoidRadius(transformComponent);
            
            let isMuchTooClose = false;
            
            // If there are any nearby embrasure use points, move to them
            const nearbyEmbrasureUsePoints = getNearbyEmbrasureUsePoints(tribesman);
            if (nearbyEmbrasureUsePoints.length > 0) {
               // Move to the closest one
               const targetUsePoint = getClosestEmbrasureUsePoint(tribesman, nearbyEmbrasureUsePoints);
               
               const usePointDirection = tribesmanHitbox.box.position.angleTo(targetUsePoint);
               const moveDir = adjustMoveDirectionForFriendlyProximity(tribesman, usePointDirection);
               
               const acceleration = getTribesmanSlowAcceleration(tribesman);
               applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, moveDir));
            } else if (willStopAtDesiredDistance(tribesmanHitbox, muchTooCloseDistance, distance)) {
               // much too close, stop charging bow all-together and just run back

               const awayDirection = tribesmanHitbox.box.position.angleTo(huntedHitbox.box.position) + Math.PI;
               const moveDir = adjustMoveDirectionForFriendlyProximity(tribesman, awayDirection);
               
               const acceleration = getTribesmanAcceleration(tribesman);
               applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, moveDir));

               isMuchTooClose = true;
            } else if (willStopAtDesiredDistance(tribesmanHitbox, Vars.DESIRED_RANGED_ATTACK_DISTANCE - 20, distance)) {
               const backDirection = tribesmanHitbox.box.angle + Math.PI;
               const moveDir = adjustMoveDirectionForFriendlyProximity(tribesman, backDirection);
               
               // If the tribesman will stop too close to the target, move back a bit
               const acceleration = getTribesmanSlowAcceleration(tribesman);
               applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, moveDir));
            } else {
               const forwardDirection = tribesmanHitbox.box.angle;
               const moveDir = adjustMoveDirectionForFriendlyProximity(tribesman, forwardDirection);

               // If the tribesman will be close enough, move closer
               const acceleration = getTribesmanSlowAcceleration(tribesman);
               applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, moveDir));
            }

            const targetAngle = tribesmanHitbox.box.position.angleTo(huntedHitbox.box.position);
            turnHitboxToAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED, 2, false);

            if (isMuchTooClose) {
               // @SPEED
               for (const limb of [hotbarLimb, inventoryUseComponent.getLimbInfo(InventoryName.offhand)]) {
                  if (limb.action === LimbAction.block) {
                     const initialLimbState = getCurrentLimbState(limb);
                     const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
                     
                     limb.action = LimbAction.returnFromBow;
                     limb.currentActionElapsedTicks = 0;
                     limb.currentActionDurationTicks = RETURN_FROM_BOW_USE_TIME_TICKS;
                     // @Speed: why are we copying?
                     limb.currentActionStartLimbState = copyLimbState(initialLimbState);
                     limb.currentActionEndLimbState = RESTING_LIMB_STATES[limbConfiguration];
                  }
               }
            } else {
               // @Copynpaste All this shit is copypasted from the client
               if (hotbarLimb.action === LimbAction.none) {
                  const holdingLimb = hotbarLimb;
                  const startHoldingLimbState = getCurrentLimbState(holdingLimb);
                  
                  holdingLimb.action = LimbAction.engageBow;
                  holdingLimb.currentActionElapsedTicks = 0;
                  holdingLimb.currentActionDurationTicks = QUIVER_ACCESS_TIME_TICKS + QUIVER_PULL_TIME_TICKS;
                  holdingLimb.currentActionRate = 1;
                  holdingLimb.currentActionStartLimbState = startHoldingLimbState;
                  holdingLimb.currentActionEndLimbState = BOW_HOLDING_LIMB_STATE;
   
                  // Meanwhile the drawing limb pulls an arrow out
                  
                  const drawingLimb = inventoryUseComponent.getLimbInfo(InventoryName.offhand);
                  const startDrawingLimbState = getCurrentLimbState(drawingLimb);
                  
                  drawingLimb.action = LimbAction.moveLimbToQuiver;
                  drawingLimb.currentActionElapsedTicks = 0;
                  drawingLimb.currentActionDurationTicks = QUIVER_ACCESS_TIME_TICKS;
                  drawingLimb.currentActionRate = 1;
                  drawingLimb.currentActionStartLimbState = startDrawingLimbState;
                  drawingLimb.currentActionEndLimbState = QUIVER_PULL_LIMB_STATE;
               } else if (hotbarLimb.action === LimbAction.chargeBow && hotbarLimb.currentActionElapsedTicks >= hotbarLimb.currentActionDurationTicks) {
                  // If the bow is fully charged, fire it
                  useItem(tribesman, selectedItem, InventoryName.hotbar, hotbarLimb.selectedItemSlot);
   
                  const holdingLimb = hotbarLimb;
                  const startHoldingLimbState = getCurrentLimbState(holdingLimb);
                  
                  holdingLimb.action = LimbAction.mainArrowReleased;
                  holdingLimb.currentActionElapsedTicks = 0;
                  holdingLimb.currentActionDurationTicks = ARROW_RELEASE_WAIT_TIME_TICKS;
                  holdingLimb.currentActionStartLimbState = copyLimbState(startHoldingLimbState);
                  holdingLimb.currentActionEndLimbState = copyLimbState(startHoldingLimbState);
         
                  const drawingLimb = inventoryUseComponent.getLimbInfo(InventoryName.offhand);
                  const startDrawingLimbState = getCurrentLimbState(drawingLimb);
         
                  drawingLimb.action = LimbAction.arrowReleased;
                  drawingLimb.currentActionElapsedTicks = 0;
                  drawingLimb.currentActionDurationTicks = ARROW_RELEASE_WAIT_TIME_TICKS;
                  // @Garbage
                  drawingLimb.currentActionStartLimbState = copyLimbState(startDrawingLimbState);
                  // @Garbage
                  drawingLimb.currentActionEndLimbState = copyLimbState(startDrawingLimbState);
               }
            }

            clearPathfinding(tribesman);
         } else {
            const isFinished = pathfindTribesman(tribesman, huntedHitbox.box.position.x, huntedHitbox.box.position.y, getEntityLayer(huntedEntity), huntedEntity, TribesmanPathType.default, Math.floor(100 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest);

            // If reached goal, turn towards the enemy
            if (isFinished) {
               const targetAngle = tribesmanHitbox.box.position.angleTo(huntedHitbox.box.position);
               turnHitboxToAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED, 0.5, false);
            }
         }

         return;
      }

      if (isAggressive && weaponCategory === "battleaxe") {
         // Use the battleaxe if the entity is in the use range
         const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, huntedEntityTransformComponent) - getHumanoidRadius(transformComponent);
         if (distance >= Vars.BATTLEAXE_MIN_USE_RANGE && distance <= Vars.BATTLEAXE_MAX_USE_RANGE && selectedItem.id !== hotbarLimb.thrownBattleaxeItemID) {
            if (hotbarLimb.action !== LimbAction.chargeBattleaxe) {
               hotbarLimb.lastBattleaxeChargeTicks = getGameTicks();
            }

            const targetDir = tribesmanHitbox.box.position.angleTo(huntedHitbox.box.position);
            turnHitboxToAngle(tribesmanHitbox, targetDir, TRIBESMAN_TURN_SPEED, 0.5, false);

            if (distance > Vars.BATTLEAXE_IDEAL_USE_RANGE + 10) {
               // Move closer
               const acceleration = getTribesmanSlowAcceleration(tribesman);
               applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, targetDir));
            } else if (distance < Vars.BATTLEAXE_IDEAL_USE_RANGE - 10) {
               // Move futher away
               const acceleration = getTribesmanSlowAcceleration(tribesman);
               const moveDir = targetDir + Math.PI;
               applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, moveDir));
            }

            const ticksSinceLastAction = getGameTicks() - hotbarLimb.lastBattleaxeChargeTicks;
            if (ticksSinceLastAction >= 3 * Settings.TICK_RATE) {
               // Throw the battleaxe
               useItem(tribesman, selectedItem, InventoryName.hotbar, mostDamagingItemSlot);
               setLimbActions(inventoryUseComponent, LimbAction.none);
            } else {
               setLimbActions(inventoryUseComponent, LimbAction.chargeBattleaxe);
            }
            
            const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
            tribesmanComponent.currentAIType = TribesmanAIType.attacking;

            clearPathfinding(tribesman);
            return;
         }
      }

      if (weaponCategory === "shield") {
         // Distance from the enemy that the tribesman will try to block at
         const blockRange = 200;
         
         const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, huntedEntityTransformComponent) - getHumanoidRadius(transformComponent);
         if (willStopAtDesiredDistance(tribesmanHitbox, blockRange, distance)) {
            // If the tribesman will stop too close to the target, move back a bit
            if (willStopAtDesiredDistance(tribesmanHitbox, blockRange - 30, distance)) {
               const backDirection = tribesmanHitbox.box.angle + Math.PI;
               const moveDir = adjustMoveDirectionForFriendlyProximity(tribesman, backDirection);
               
               const acceleration = getTribesmanSlowAcceleration(tribesman);
               applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, moveDir));
            }

            const targetDir = tribesmanHitbox.box.position.angleTo(huntedHitbox.box.position);
            turnHitboxToAngle(tribesmanHitbox, targetDir, TRIBESMAN_TURN_SPEED, 0.5, false);
         
            // If not blocking already, start blocking
            const limb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
            if (limb.action === LimbAction.none) {
               // @COPYNPASTE from processStartItemUsePacket

               const initialLimbState = getCurrentLimbState(limb);

               const attackInfo = getItemAttackInfo(selectedItem.type);
               assert(attackInfo.attackTimings.blockTimeTicks !== null);
               
               // Begin blocking
               limb.action = LimbAction.engageBlock;
               limb.currentActionElapsedTicks = 0;
               limb.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks;
               limb.currentActionRate = 1;
               // @Speed: why are we copying?
               limb.currentActionStartLimbState = copyLimbState(initialLimbState);
               limb.currentActionEndLimbState = selectedItem.type !== null && ITEM_TYPE_RECORD[selectedItem.type] === "shield" ? SHIELD_BLOCKING_LIMB_STATE : BLOCKING_LIMB_STATE;
            }

            clearTribesmanPath(tribesman);
         } else {
            const pointDistance = tribesmanHitbox.box.position.distanceTo(huntedHitbox.box.position);
            const targetDirectRadius = pointDistance - distance;

            const goalRadius = Math.floor((blockRange + targetDirectRadius) / PathfindingSettings.NODE_SEPARATION);
            // @Temporary?
            // const failureDefault = isAggressive ? PathfindFailureDefault.returnClosest : PathfindFailureDefault.throwError;
            const failureDefault = isAggressive ? PathfindFailureDefault.returnClosest : PathfindFailureDefault.none;
            pathfindTribesman(tribesman, huntedHitbox.box.position.x, huntedHitbox.box.position.y, getEntityLayer(huntedEntity), huntedEntity, TribesmanPathType.default, goalRadius, failureDefault);
         }
         
         return;
      }
   }

   // @Cleanup: Shouldn't be done here. Just skip out of this function and let the main path do the repairing.
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const hammerItemSlot = getBestHammerItemSlot(hotbarInventory);
   if (hammerItemSlot !== null) {
      // If there isn't a path to the entity, try to repair buildings
      // @Incomplete: This will cause a delay after the tribesman finishes repairing the building.
      const ageTicks = getEntityAgeTicks(tribesman);
      if (ageTicks % (Settings.TICK_RATE / 2) === 0) {
         const pathExists = pathToEntityExists(tribesman, huntedEntity, getHumanoidRadius(transformComponent));
         if (!pathExists) {
            const isRepairing = attemptToRepairBuildings(tribesman, hammerItemSlot);
            if (isRepairing) {
               return;
            }
         }
      } else {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         if (tribesmanComponent.currentAIType === TribesmanAIType.repairing) {
            const isRepairing = attemptToRepairBuildings(tribesman, hammerItemSlot);
            if (isRepairing) {
               return;
            }
         }
      }
   }

   const desiredAttackRange = getTribesmanDesiredAttackRange();
   const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, huntedEntityTransformComponent) - getHumanoidRadius(transformComponent);
   if (distance < desiredAttackRange) {
      // If the tribesman will stop too close to the target, move back a bit
      if (distance < desiredAttackRange - 10) {
         const acceleration = getTribesmanSlowAcceleration(tribesman);
         applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, tribesmanHitbox.box.angle + Math.PI));
      }

      const targetAngle = tribesmanHitbox.box.position.angleTo(huntedHitbox.box.position);
      turnHitboxToAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED, 0.5, false);
   
      // If in melee range, try to do a melee attack
      doMeleeAttack(tribesman, mostDamagingItemSlot);

      clearPathfinding(tribesman);
   } else {
      const pointDistance = tribesmanHitbox.box.position.distanceTo(huntedHitbox.box.position);
      const targetDirectRadius = pointDistance - distance;

      // @TEMPORARY? cuz they aren't going close enough
      // const goalRadius = Math.floor((desiredAttackRange + targetDirectRadius) / PathfindingSettings.NODE_SEPARATION);
      const goalRadius = Math.floor((targetDirectRadius) / PathfindingSettings.NODE_SEPARATION);
      // @Temporary?
      // const failureDefault = isAggressive ? PathfindFailureDefault.returnClosest : PathfindFailureDefault.throwError;
      const failureDefault = isAggressive ? PathfindFailureDefault.returnClosest : PathfindFailureDefault.none;
      pathfindTribesman(tribesman, huntedHitbox.box.position.x, huntedHitbox.box.position.y, getEntityLayer(huntedEntity), huntedEntity, TribesmanPathType.default, goalRadius, failureDefault);
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanComponent.currentAIType = TribesmanAIType.attacking;
}