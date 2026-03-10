import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { BlueprintType, BuildingMaterial, MATERIAL_TO_ITEM_MAP, ServerComponentType } from "battletribes-shared/components";
import { EntityType, Entity, LimbAction } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TribesmanTitle } from "battletribes-shared/titles";
import { TribeType } from "battletribes-shared/tribes";
import { Point, dotAngles, lerp, polarVec2, randAngle } from "battletribes-shared/utils";
import { InventoryComponentArray, consumeItemFromSlot, consumeItemType, countItemType, getInventory, inventoryIsFull } from "../../components/InventoryComponent";
import { getEntitiesInRange } from "../../ai-shared";
import { HealthComponentArray, healEntity } from "../../components/HealthComponent";
import { clearStatusEffects } from "../../components/StatusEffectComponent";
import { getCurrentLimbState, InventoryUseComponentArray } from "../../components/InventoryUseComponent";
import { createBattleaxeProjectileConfig } from "../projectiles/battleaxe-projectile";
import { createIceArrowConfig } from "../projectiles/ice-arrow";
import { TribeComponentArray } from "../../components/TribeComponent";
import { TribesmanAIComponentArray } from "../../components/TribesmanAIComponent";
import { createItemEntityConfig } from "../item-entity";
import { StructureComponentArray } from "../../components/StructureComponent";
import { BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";
import { Item, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, BattleaxeItemInfo, SwordItemInfo, AxeItemInfo, InventoryName, ItemType, ConsumableItemInfo, ConsumableItemCategory, PlaceableItemType, BowItemInfo, itemIsStackable, getItemStackSize, ARROW_RELEASE_WAIT_TIME_TICKS } from "battletribes-shared/items/items";
import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import { registerEntityTickEvent } from "../../server/player-clients";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createWoodenArrowConfig } from "../projectiles/wooden-arrow";
import { EntityConfig, getConfigTransformComponent } from "../../components";
import { createSpearProjectileConfig } from "../projectiles/spear-projectile";
import { createBlueprintEntityConfig } from "../blueprint-entity";
import { AttackVars, copyLimbState } from "battletribes-shared/attack-patterns";
import { createEntity, destroyEntity, getEntityLayer, getEntityType, getGameTicks } from "../../world";
import { awardTitle, hasTitle, TribesmanComponentArray } from "../../components/TribesmanComponent";
import { calculateEntityPlaceInfo, createStructureConfig } from "../../structure-placement";
import { getHitboxVelocity, Hitbox, addHitboxVelocity } from "../../hitboxes";
import { createItem } from "../../items";

const enum Vars {
   ITEM_THROW_FORCE = 100,
   ITEM_THROW_OFFSET = 32
}

export const VACUUM_RANGE = 85;

const getDamageMultiplier = (entity: Entity): number => {
   let multiplier = 1;

   if (TribesmanComponentArray.hasComponent(entity)) {
      const tribesmanComponent = TribesmanComponentArray.getComponent(entity);

      for (let i = 0; i < tribesmanComponent.titles.length; i++) {
         const title = tribesmanComponent.titles[i].title;

         switch (title) {
            case TribesmanTitle.deathbringer: {
               multiplier *= 1.15;
               break;
            }
         }
      }
   }

   return multiplier;
}

export function calculateItemDamage(entity: Entity, itemType: ItemType | null, attackEffectiveness: AttackEffectiveness, attackIsBlocked: boolean): number {
   if (attackEffectiveness === AttackEffectiveness.stopped) {
      return 0;
   }
   
   let damage: number;
   if (itemType === null) {
      damage = 1;
   } else {
      // @Cleanup
      const itemCategory = ITEM_TYPE_RECORD[itemType];
      switch (itemCategory) {
         case "battleaxe": {
            const itemInfo = ITEM_INFO_RECORD[itemType] as BattleaxeItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               damage = itemInfo.damage;
            } else {
               damage = Math.floor(itemInfo.damage / 2);
            }
            break;
         }
         case "spear":
         case "sword": {
            const itemInfo = ITEM_INFO_RECORD[itemType] as SwordItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               damage = itemInfo.damage;
            } else {
               damage = Math.ceil(itemInfo.damage / 2);
            }
            break;
         }
         case "axe": {
            const itemInfo = ITEM_INFO_RECORD[itemType] as AxeItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               damage = itemInfo.damage;
            } else {
               damage = Math.ceil(itemInfo.damage / 3);
            }
            break;
         }
         case "pickaxe": {
            const itemInfo = ITEM_INFO_RECORD[itemType] as AxeItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               damage = itemInfo.damage;
            } else {
               damage = Math.floor(itemInfo.damage / 4);
            }
            break;
         }
         default: {
            damage = 1;
         }
      }
   }

   if (attackIsBlocked) {
      damage *= 0.5;
   }

   return damage * getDamageMultiplier(entity);
}

const getRepairTimeMultiplier = (tribeMember: Entity): number => {
   let multiplier = 1;
   
   if (getEntityType(tribeMember) === EntityType.tribeWarrior) {
      multiplier *= 2;
   }

   return multiplier;
}

// @Incomplete: unused
export function getSwingTimeMultiplier(entity: Entity, item: Item | null): number {
   let swingTimeMultiplier = 1;

   if (TribeComponentArray.hasComponent(entity)) {
      // Barbarians swing 30% slower
      const tribeComponent = TribeComponentArray.getComponent(entity);
      if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
         swingTimeMultiplier /= 0.7;
      }
   }

   // Builers swing hammers 30% faster
   if (hasTitle(entity, TribesmanTitle.builder) && item !== null && ITEM_TYPE_RECORD[item.type] === "hammer") {
      swingTimeMultiplier /= 1.3;
   }

   return swingTimeMultiplier;
}

// @Cleanup: Rename function. shouldn't be 'attack'
// @Cleanup: Not just for tribe members, move to different file
export function calculateRadialAttackTargets(entity: Entity, attackOffset: number, attackRadius: number): ReadonlyArray<Entity> {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = transformComponent.hitboxes[0];
   const layer = getEntityLayer(entity);
   
   const attackPositionX = entityHitbox.box.position.x + attackOffset * Math.sin(entityHitbox.box.angle);
   const attackPositionY = entityHitbox.box.position.y + attackOffset * Math.cos(entityHitbox.box.angle);
   const attackedEntities = getEntitiesInRange(layer, attackPositionX, attackPositionY, attackRadius);
   
   // Don't attack yourself
   for (;;) {
      const idx = attackedEntities.indexOf(entity);
      if (idx !== -1) {
         attackedEntities.splice(idx, 1);
      } else {
         break;
      }
   }

   return attackedEntities;
}

export function useItem(tribeMember: Entity, item: Item, inventoryName: InventoryName, itemSlot: number): void {
   const itemCategory = ITEM_TYPE_RECORD[item.type];

   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
   
   // @Cleanup: Extract each one of these cases into their own function

   switch (itemCategory) {
      case "armour": {
         // 
         // Equip the armour
         // 
         
         const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
         const targetItem = armourSlotInventory.itemSlots[1];
         
         // If the target item slot has a different item type, don't attempt to transfer
         if (typeof targetItem !== "undefined" && targetItem.type !== item.type) {
            return;
         }
         
         // Move to armour slot
         const inventory = getInventory(inventoryComponent, inventoryName);
         inventory.removeItem(itemSlot);
         armourSlotInventory.addItem(item, 1);
         break;
      }
      case "glove": {
         // 
         // Equip the glove
         // 
         
         const gloveSlotInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
         const targetItem = gloveSlotInventory.itemSlots[1];

         // If the target item slot has a different item type, don't attempt to transfer
         if (typeof targetItem !== "undefined" && targetItem.type !== item.type) {
            return;
         }

         // Move to glove slot
         const inventory = getInventory(inventoryComponent, inventoryName);
         inventory.removeItem(itemSlot);
         gloveSlotInventory.addItem(item, 1);
         break;
      }
      case "healing": {
         // Don't use food if already at maximum health
         const healthComponent = HealthComponentArray.getComponent(tribeMember);
         if (healthComponent.health >= healthComponent.maxHealth) return;

         const itemInfo = ITEM_INFO_RECORD[item.type] as ConsumableItemInfo;
         
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);

         const inventory = getInventory(inventoryComponent, inventoryName);
         const limb = inventoryUseComponent.getLimbInfo(inventoryName)
         
         healEntity(tribeMember, itemInfo.healAmount, tribeMember);
         consumeItemFromSlot(tribeMember, inventory, itemSlot, 1);

         limb.lastEatTicks = getGameTicks();

         if (item.type === ItemType.berry && Math.random() < 0.05) {
            awardTitle(tribeMember, TribesmanTitle.berrymuncher);
         }

         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            // Remove all debuffs
            clearStatusEffects(tribeMember);
         }

         // If all of the item was consumed, stop the eating action
         if (!inventory.hasItem(itemSlot)) {
            limb.action = LimbAction.none;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = 0;
         }
         
         const event: EntityTickEvent = {
            entityID: tribeMember,
            type: EntityTickEventType.foodBurp,
            data: 0
         };
         registerEntityTickEvent(tribeMember, event);

         break;
      }
      case "placeable": {
         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         const tribeMemberHitbox = transformComponent.hitboxes[0];
         
         const structureType = ITEM_INFO_RECORD[item.type as PlaceableItemType].entityType;
         const placeInfo = calculateEntityPlaceInfo(tribeMemberHitbox.box.position, tribeMemberHitbox.box.angle, structureType, getEntityLayer(tribeMember));

         if (placeInfo.isValid) {
            const tribeComponent = TribeComponentArray.getComponent(tribeMember);
            // @SQUEAM
            let entityConfig: EntityConfig;
            if (placeInfo.entityType === EntityType.slingTurret) {
               entityConfig = createBlueprintEntityConfig(placeInfo.position, placeInfo.angle, tribeComponent.tribe, BlueprintType.slingTurret, 0, null, []);
            } else {
               entityConfig = createStructureConfig(tribeComponent.tribe, placeInfo.entityType, placeInfo.position, placeInfo.angle, placeInfo.connections);
            }
            createEntity(entityConfig, getEntityLayer(tribeMember), 0);

            const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
            consumeItemFromSlot(tribeMember, inventory, itemSlot, 1);
         }
         break;
      }
      case "bow": {
         const transformComponent = TransformComponentArray.getComponent(tribeMember);

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         const limb = inventoryUseComponent.getLimbInfo(inventoryName);
         if (limb.action !== LimbAction.chargeBow || limb.currentActionElapsedTicks < limb.currentActionDurationTicks) {
            return;
         }

         consumeItemType(tribeMember, inventoryComponent, ItemType.woodenArrow, 1);

         const event: EntityTickEvent<EntityTickEventType.fireBow> = {
            entityID: tribeMember,
            type: EntityTickEventType.fireBow,
            data: item.type
         };
         registerEntityTickEvent(tribeMember, event);

         limb.lastBowChargeTicks = getGameTicks();

         const itemInfo = ITEM_INFO_RECORD[item.type] as BowItemInfo;

         // Offset the arrow's spawn to be just outside of the tribe member's hitox
         // @Speed: Garbage collectionb
         const tribeMemberHitbox = transformComponent.hitboxes[0];
         const spawnPosition = tribeMemberHitbox.box.position.copy();
         const offset = polarVec2(35, tribeMemberHitbox.box.angle);
         spawnPosition.add(offset);

         const angle = tribeMemberHitbox.box.angle;
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         let arrowConfig: EntityConfig;
         switch (item.type) {
            case ItemType.wooden_bow:
            case ItemType.reinforced_bow: {
               arrowConfig = createWoodenArrowConfig(spawnPosition, angle, tribeComponent.tribe, tribeMember);
               break;
            }
            case ItemType.ice_bow: {
               arrowConfig = createIceArrowConfig(spawnPosition, angle, tribeComponent.tribe, tribeMember);
               break;
            }
            // @Robustness
            default: {
               throw new Error("No case for bow type " + item.type);
            }
         }

         const tribeMemberVelocity = getHitboxVelocity(tribeMemberHitbox);
         const arrowHitbox = getConfigTransformComponent(arrowConfig.components).hitboxes[0];

         const arrowVel = tribeMemberVelocity.copy();
         arrowVel.add(polarVec2(itemInfo.projectileSpeed, angle));
         addHitboxVelocity(arrowHitbox, arrowVel);
         
         createEntity(arrowConfig, getEntityLayer(tribeMember), 0);

         const holdingLimb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
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
         
         break;
      }
      case "crossbow": {
         const transformComponent = TransformComponentArray.getComponent(tribeMember);

         // Don't fire if not loaded
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         const useInfo = inventoryUseComponent.getLimbInfo(inventoryName);

         const loadProgress = useInfo.crossbowLoadProgressRecord[itemSlot];
         if (typeof loadProgress === "undefined" || loadProgress < 1) {
            return;
         }

         const tribeMemberHitbox = transformComponent.hitboxes[0];

         // @Cleanup: Copy and paste
         const event: EntityTickEvent<EntityTickEventType.fireBow> = {
            entityID: tribeMember,
            type: EntityTickEventType.fireBow,
            data: item.type
         };
         registerEntityTickEvent(tribeMember, event);

         // Offset the arrow's spawn to be just outside of the tribe member's hitbox
         // @Speed: Garbage collection
         const spawnPosition = tribeMemberHitbox.box.position.copy();
         const offset = polarVec2(35, tribeMemberHitbox.box.angle);
         spawnPosition.add(offset);
         
         const itemInfo = ITEM_INFO_RECORD[item.type] as BowItemInfo;

         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         // @Copynpaste from bow above
         const config = createWoodenArrowConfig(spawnPosition, tribeMemberHitbox.box.angle, tribeComponent.tribe, tribeMember);

         const arrowHitbox = getConfigTransformComponent(config.components).hitboxes[0];
         addHitboxVelocity(arrowHitbox, polarVec2(itemInfo.projectileSpeed, tribeMemberHitbox.box.angle));

         createEntity(config, getEntityLayer(tribeMember), 0);

         delete useInfo.crossbowLoadProgressRecord[itemSlot];
         
         break;
      }
      case "spear": {
         // 
         // Throw the spear
         // 

         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         const tribeMemberHitbox = transformComponent.hitboxes[0];

         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         
         const inventory = getInventory(inventoryComponent, inventoryName);
         const limbInfo = inventoryUseComponent.getLimbInfo(inventoryName);

         const offsetDirection = tribeMemberHitbox.box.angle + Math.PI / 1.5 - Math.PI / 14;
         const x = tribeMemberHitbox.box.position.x + 35 * Math.sin(offsetDirection);
         const y = tribeMemberHitbox.box.position.y + 35 * Math.cos(offsetDirection);

         const secondsSinceLastAction = limbInfo.currentActionElapsedTicks * Settings.DT_S;
         const velocityMagnitude = lerp(1000, 1700, Math.min(secondsSinceLastAction / 3, 1));

         const config = createSpearProjectileConfig(new Point(x, y), tribeMemberHitbox.box.angle, tribeMember, null);

         const spearProjectileHitbox = getConfigTransformComponent(config.components).hitboxes[0];
         
         const tribeMemberVelocity = getHitboxVelocity(tribeMemberHitbox);
         const spearVel = tribeMemberVelocity.copy();
         spearVel.add(polarVec2(velocityMagnitude, tribeMemberHitbox.box.angle));
         addHitboxVelocity(spearProjectileHitbox, spearVel);

         createEntity(config, getEntityLayer(tribeMember), 0);

         consumeItemFromSlot(tribeMember, inventory, itemSlot, 1);

         // Once thrown, the limb goes back to doing nothing
         limbInfo.action = LimbAction.none;

         break;
      }
      case "battleaxe": {
         // 
         // Throw the battleaxe
         // 

         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         const tribeMemberHitbox = transformComponent.hitboxes[0];
         
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const useInfo = inventoryUseComponent.getLimbInfo(inventoryName);

         const offsetDirection = tribeMemberHitbox.box.angle + Math.PI / 1.5 - Math.PI / 14;
         const x = tribeMemberHitbox.box.position.x + 35 * Math.sin(offsetDirection);
         const y = tribeMemberHitbox.box.position.y + 35 * Math.cos(offsetDirection);

         const ticksSinceLastAction = getGameTicks() - useInfo.lastBattleaxeChargeTicks;
         const secondsSinceLastAction = ticksSinceLastAction * Settings.DT_S;
         const velocityMagnitude = lerp(600, 1100, Math.min(secondsSinceLastAction / 3, 1));

         const config = createBattleaxeProjectileConfig(new Point(x, y), tribeMemberHitbox.box.angle, tribeComponent.tribe, tribeMember, item.id);

         const tribeMemberVelocity = getHitboxVelocity(tribeMemberHitbox);
         
         const battleaxeProjectileHitbox = getConfigTransformComponent(config.components).hitboxes[0];
         const vel = tribeMemberVelocity.copy();
         vel.add(polarVec2(velocityMagnitude, tribeMemberHitbox.box.angle));
         addHitboxVelocity(battleaxeProjectileHitbox, vel);

         createEntity(config, getEntityLayer(tribeMember), 0);

         useInfo.lastBattleaxeChargeTicks = getGameTicks();
         useInfo.thrownBattleaxeItemID = item.id;
         
         break;
      }
   }
}

export function tribeMemberCanPickUpItem(tribeMember: Entity, itemType: ItemType): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);

   if (!inventoryIsFull(inventory)) {
      return true;
   }
   
   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      if (item.type === itemType && itemIsStackable(item.type) && item.count < getItemStackSize(item.type)) {
         return true;
      }
   }

   return false;
}

export function entityIsTribesman(entityType: EntityType): boolean {
   return entityType === EntityType.player || entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior;
}

export function wasTribeMemberKill(attackingEntity: Entity | null): boolean {
   return attackingEntity !== null && TribeComponentArray.hasComponent(attackingEntity);
}

const blueprintTypeMatchesBuilding = (structure: Entity, blueprintType: BlueprintType): boolean => {
   const materialComponent = BuildingMaterialComponentArray.getComponent(structure);

   const entityType = getEntityType(structure);
   
   if (entityType === EntityType.wall) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneWall || blueprintType === BlueprintType.woodenDoor || blueprintType === BlueprintType.woodenEmbrasure || blueprintType === BlueprintType.woodenTunnel;
         case BuildingMaterial.stone: return blueprintType === BlueprintType.stoneDoor || blueprintType === BlueprintType.stoneEmbrasure || blueprintType === BlueprintType.stoneTunnel;
      }
   }

   if (entityType === EntityType.door) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneDoorUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.embrasure) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneEmbrasureUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.tunnel) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneTunnelUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.floorSpikes) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneFloorSpikes;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.wallSpikes) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneWallSpikes;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.workerHut) {
      return blueprintType === BlueprintType.warriorHutUpgrade;
   }

   if (entityType === EntityType.fence) {
      return blueprintType === BlueprintType.fenceGate;
   }

   if (entityType === EntityType.bracings) {
      return blueprintType === BlueprintType.stoneBracings;
   }

   return false;
}

const getFenceGatePlaceDirection = (fence: Entity): number => {
   const structureComponent = StructureComponentArray.getComponent(fence);

   // Fence gates always have two connections on their left and right, so we simply add 90deg to
   // the direction of one of the connections.

   const connection = structureComponent.connections[0];

   const transformComponent = TransformComponentArray.getComponent(fence);
   const fenceHitbox = transformComponent.hitboxes[0];
   
   const connectingFenceTransformComponent = TransformComponentArray.getComponent(connection.entity);
   const connectedFenceHitbox = connectingFenceTransformComponent.hitboxes[0];

   let direction = fenceHitbox.box.position.angleTo(connectedFenceHitbox.box.position);
   return direction + Math.PI * 0.5;
}

export function placeBlueprint(tribeMember: Entity, structure: Entity, blueprintType: BlueprintType, dynamicRotation: number): void {
   if (!blueprintTypeMatchesBuilding(structure, blueprintType)) {
      return;
   }

   const structureTransformComponent = TransformComponentArray.getComponent(structure);
   const structureHitbox = structureTransformComponent.hitboxes[0];
   
   // @Cleanup
   switch (blueprintType) {
      case BlueprintType.woodenEmbrasure:
      case BlueprintType.woodenDoor:
      case BlueprintType.woodenTunnel:
      case BlueprintType.stoneDoor:
      case BlueprintType.stoneEmbrasure:
      case BlueprintType.stoneTunnel: {
         const position = structureHitbox.box.position.copy();
         if (blueprintType === BlueprintType.woodenEmbrasure || blueprintType === BlueprintType.stoneEmbrasure) {
            position.x += 22 * Math.sin(dynamicRotation);
            position.y += 22 * Math.cos(dynamicRotation);
         }
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig(position, dynamicRotation, tribeComponent.tribe, blueprintType, 0, null, []);
         createEntity(config, getEntityLayer(tribeMember), 0);
         
         destroyEntity(structure);
         break;
      }
      case BlueprintType.stoneDoorUpgrade:
      case BlueprintType.stoneEmbrasureUpgrade:
      case BlueprintType.stoneTunnelUpgrade:
      case BlueprintType.stoneFloorSpikes:
      case BlueprintType.stoneWallSpikes:
      case BlueprintType.stoneWall:
      case BlueprintType.stoneBracings: {
         const materialComponent = BuildingMaterialComponentArray.getComponent(structure);
         const upgradeMaterialItemType = MATERIAL_TO_ITEM_MAP[(materialComponent.material + 1) as BuildingMaterial];
         
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         if (countItemType(inventoryComponent, upgradeMaterialItemType) < 5) {
            return;
         }

         // Upgrade

         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig(structureHitbox.box.position.copy(), structureHitbox.box.angle, tribeComponent.tribe, blueprintType, 0, null, []);
         createEntity(config, getEntityLayer(tribeMember), 0);
         
         consumeItemType(tribeMember, inventoryComponent, upgradeMaterialItemType, 5);

         destroyEntity(structure);

         break;
      }
      case BlueprintType.warriorHutUpgrade: {
         // @Cleanup: copy and paste

         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         if (countItemType(inventoryComponent, ItemType.rock) < 25 || countItemType(inventoryComponent, ItemType.wood) < 15) {
            return;
         }

         // Upgrade

         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig(structureHitbox.box.position.copy(), structureHitbox.box.angle, tribeComponent.tribe, blueprintType, structure, null, []);
         createEntity(config, getEntityLayer(tribeMember), 0);

         consumeItemType(tribeMember, inventoryComponent, ItemType.rock, 25);
         consumeItemType(tribeMember, inventoryComponent, ItemType.wood, 15);

         break;
      }
      case BlueprintType.fenceGate: {
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         if (countItemType(inventoryComponent, ItemType.wood) < 5) {
            return;
         }

         let rotation = getFenceGatePlaceDirection(structure);

         // Make rotation face away from player
         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         const tribeMemberHitbox = transformComponent.hitboxes[0];
         if (dotAngles(rotation, tribeMemberHitbox.box.angle) < 0) {
            rotation = rotation + Math.PI;
         }

         const structureComponent = StructureComponentArray.getComponent(structure);
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig(structureHitbox.box.position.copy(), rotation, tribeComponent.tribe, blueprintType, 0, null, structureComponent.connections);
         createEntity(config, getEntityLayer(tribeMember), 0);

         consumeItemType(tribeMember, inventoryComponent, ItemType.wood, 5);

         destroyEntity(structure);
      }
   }
}

// @Cleanup: why need 2?

export function onTribeMemberCollision(tribesman: Entity, collidingEntity: Entity): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.berryBush || collidingEntityType === EntityType.tree) {
      const tribesmanComponent = TribesmanComponentArray.getComponent(tribesman);
      tribesmanComponent.lastPlantCollisionTicks = getGameTicks();
   }
}

export function throwItem(tribesman: Entity, inventoryName: InventoryName, itemSlot: number, dropAmount: number, throwDirection: number): void {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const inventory = getInventory(inventoryComponent, inventoryName);

   const item = inventory.itemSlots[itemSlot];
   if (typeof item === "undefined") {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const amountRemoved = consumeItemFromSlot(tribesman, inventory, itemSlot, dropAmount);

   const dropPosition = tribesmanHitbox.box.position.copy();
   dropPosition.x += Vars.ITEM_THROW_OFFSET * Math.sin(throwDirection);
   dropPosition.y += Vars.ITEM_THROW_OFFSET * Math.cos(throwDirection);

   // Create the item entity
   const config = createItemEntityConfig(dropPosition, randAngle(), createItem(item.type, amountRemoved, item.nickname, item.namer), tribesman);

   // Throw the dropped item away from the player
   const tribesmanVelocity = getHitboxVelocity(tribesmanHitbox);
   const itemHitbox = getConfigTransformComponent(config.components).hitboxes[0];

   const vel = tribesmanVelocity.copy();
   vel.add(polarVec2(Vars.ITEM_THROW_FORCE, throwDirection));
   addHitboxVelocity(itemHitbox, vel);

   createEntity(config, getEntityLayer(tribesman), 0);

   if (TribesmanAIComponentArray.hasComponent(tribesman)) {
      const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
      tribesmanComponent.lastItemThrowTicks = getGameTicks();
   }
}