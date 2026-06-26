import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityType } from "../../../shared/dist/entities.js";
import { ItemType, ITEM_TYPE_RECORD } from "../../../shared/dist/items/items.js";
import { Settings } from "../../../shared/dist/settings.js";
import { assert } from "../../../shared/dist/utils.js";
import { getBoxTile } from "../hitboxes.js";
import { getEntityLayer, getEntityType } from "../world.js";
import { LocalBiome } from "../world-generation/terrain-generation-utils.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { createItemsOverEntity } from "../entities/item-entity.js";

// @ROBUSTNESS: The game really should crash or show a warning or something when an entity register loot on hit/death but the entity doesn't have a loot component because i've forgotten to add it.

export interface LootEntry {
   readonly itemType: ItemType;
   readonly getAmount: (entity: Entity) => number;
   /** Called every time an item is dropped. */
   readonly onItemDrop?: (entity: Entity) => void;
   /** If present then the items will be created only on the hitbox at the specified index */
   readonly hitboxIdx?: number;
}

const lootOnHitRecord: Partial<Record<EntityType, LootEntry[]>> = {};
const lootOnDeathRecord: Partial<Record<EntityType, LootEntry[]>> = {};

const itemToEntityTypesRecord: Partial<Record<ItemType, EntityType[]>> = {};

export class LootComponent {
   public localBiome: LocalBiome | null = null;
}

export const LootComponentArray = new ComponentArray<LootComponent>(ServerComponentType.loot, true, getDataLength, addDataToPacket);
LootComponentArray.onJoin = onJoin;
LootComponentArray.onTick = {
   tickInterval: Settings.TICK_RATE,
   func: onTick
};
LootComponentArray.onRemove = onRemove;
LootComponentArray.onTakeDamage = onHit;
LootComponentArray.onDeath = onDeath;

const registerLootEntry = (entityType: EntityType, entry: LootEntry): void => {
   const entityTypes = itemToEntityTypesRecord[entry.itemType];
   if (entityTypes === undefined) {
      itemToEntityTypesRecord[entry.itemType] = [entityType];
   } else {
      entityTypes.push(entityType);
   }
}

export function registerEntityLootOnHit(entityType: EntityType, entry: LootEntry): void {
   const existingLootEntries = lootOnHitRecord[entityType];
   if (existingLootEntries === undefined) {
      lootOnHitRecord[entityType] = [entry];
   } else {
      existingLootEntries.push(entry);
   }

   registerLootEntry(entityType, entry);
}

export function registerEntityLootOnDeath(entityType: EntityType, entry: LootEntry): void {
   const existingLootEntries = lootOnDeathRecord[entityType];
   if (existingLootEntries === undefined) {
      lootOnDeathRecord[entityType] = [entry];
   } else {
      existingLootEntries.push(entry);
   }

   registerLootEntry(entityType, entry);
}

const removeFromPreviousLocalBiome = (entity: Entity, lootComponent: LootComponent): void => {
   if (lootComponent.localBiome === null) {
      return;
   }

   const census = lootComponent.localBiome.entityCensus;
   const entityType = getEntityType(entity);
   
   const previousCount = census.get(entityType);
   assert(previousCount !== undefined);

   census.set(entityType, previousCount - 1);
   if (previousCount === 1) {
      census.delete(entityType);
   }
}

const addToNewLocalBiome = (entity: Entity, lootComponent: LootComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(entity);
   const tileIndex = getBoxTile(hitbox.box);
   const localBiome = layer.getTileLocalBiome(tileIndex);

   lootComponent.localBiome = localBiome;

   const entityType = getEntityType(entity);
   const census = localBiome.entityCensus;
 
   const previousCount = census.get(entityType);
   if (previousCount === undefined) {
      census.set(entityType, 1);
   } else {
      census.set(entityType, previousCount + 1);
   }
}

function onJoin(entity: Entity): void {
   const lootComponent = LootComponentArray.getComponent(entity);
   addToNewLocalBiome(entity, lootComponent);
}

function onTick(entity: Entity): void {
   const lootComponent = LootComponentArray.getComponent(entity);
   removeFromPreviousLocalBiome(entity, lootComponent);
   addToNewLocalBiome(entity, lootComponent);
}

function onRemove(entity: Entity): void {
   const lootComponent = LootComponentArray.getComponent(entity);
   removeFromPreviousLocalBiome(entity, lootComponent);
}

function onHit(entity: Entity): void {
   const entityType = getEntityType(entity);

   const entries = lootOnHitRecord[entityType];
   if (entries !== undefined) {
      for (const entry of entries) {
         const amount = entry.getAmount(entity);
         createItemsOverEntity(entity, entry.itemType, amount, entry.hitboxIdx);

         if (entry.onItemDrop !== undefined) {
            entry.onItemDrop(entity);
         }
      }
   }
}

function onDeath(entity: Entity): void {
   const entityType = getEntityType(entity);

   const entries = lootOnDeathRecord[entityType];
   if (entries !== undefined) {
      for (const entry of entries) {
         const amount = entry.getAmount(entity);
         createItemsOverEntity(entity, entry.itemType, amount, entry.hitboxIdx);
      }
   }
}

export function getEntityTypesWhichDropItem(itemType: ItemType): readonly EntityType[] {
   const entityTypes = itemToEntityTypesRecord[itemType];
   return entityTypes !== undefined ? entityTypes : [];
}

export function entityDropsItem(entity: Entity, itemType: ItemType): boolean {
   const entityType = getEntityType(entity);

   const onHitEntries = lootOnHitRecord[entityType];
   if (onHitEntries !== undefined) {
      for (const entry of onHitEntries) {
         if (entry.itemType === itemType && entry.getAmount(entity) > 0) {
            return true;
         }
      }
   }

   const onDeathEntries = lootOnDeathRecord[entityType];
   if (onDeathEntries !== undefined) {
      for (const entry of onDeathEntries) {
         if (entry.itemType === itemType && entry.getAmount(entity) > 0) {
            return true;
         }
      }
   }

   return false;
}

// @Location: should this really be in the LootComponent? Feels like it should be in the place which calls it
export function entityDropsFoodItem(entity: Entity): boolean {
   const entityType = getEntityType(entity);

   const onHitEntries = lootOnHitRecord[entityType];
   if (onHitEntries !== undefined) {
      for (const entry of onHitEntries) {
         if (ITEM_TYPE_RECORD[entry.itemType] === "healing" && entry.getAmount(entity) > 0) {
            return true;
         }
      }
   }

   const onDeathEntries = lootOnDeathRecord[entityType];
   if (onDeathEntries !== undefined) {
      for (const entry of onDeathEntries) {
         if (ITEM_TYPE_RECORD[entry.itemType] === "healing" && entry.getAmount(entity) > 0) {
            return true;
         }
      }
   }

   return false;
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}