import { PlayerKnockbackData, HealData, ResearchOrbCompleteData } from "battletribes-shared/client-server-types";
import Layer from "../Layer";
import { registerCommand } from "../commands";
import PlayerClient, { HitData } from "./PlayerClient";
import { createInitialGameDataPacket } from "./packet-sending";
import { Entity } from "battletribes-shared/entities";
import { TRIBE_INFO_RECORD, TribeType } from "battletribes-shared/tribes";
import { InventoryComponentArray, addItemToInventory, getInventory } from "../components/InventoryComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { getTileX, getTileY, Point, randInt, randItem } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { getTilesOfBiome } from "../census";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TurretComponentArray } from "../components/TurretComponent";
import { EntitySummonPacket } from "battletribes-shared/dev-packets";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import { EntityTickEvent } from "battletribes-shared/entity-events";
import { TransformComponentArray } from "../components/TransformComponent";
import { destroyEntity, entityExists } from "../world";
import { surfaceLayer } from "../layers";
import { Hitbox } from "../hitboxes";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { PacketReader } from "../../../shared/src/packets";
import { createItem } from "../items";

// @Cleanup: see if a decorator can be used to cut down on the player entity check copy-n-paste

/** Minimum number of units away from the border that the player will spawn at */
const PLAYER_SPAWN_POSITION_PADDING = 300;

const playerClients = new Array<PlayerClient>();

const dirtyEntities = new Set<Entity>();

export function getPlayerClients(): ReadonlyArray<PlayerClient> {
   return playerClients;
}

// @Cleanup: better to be done by the player component array
export function getPlayerFromUsername(username: string): Entity | null {
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];

      if (playerClient.username === username && entityExists(playerClient.instance)) {
         return playerClient.instance;
      }
   }

   return null;
}

export function handlePlayerDisconnect(playerClient: PlayerClient): void {
   // Remove player client
   const idx = playerClients.indexOf(playerClient);
   if (idx !== -1) {
      playerClients.splice(idx, 1);
   } else {
      console.warn("Could not find the player client.");
   }

   // Kill the player
   if (entityExists(playerClient.instance)) {
      destroyEntity(playerClient.instance);
   }
}

export function generatePlayerSpawnPosition(tribeType: TribeType): Point {
   // @Temporary @Squeam
   return new Point(Settings.WORLD_UNITS * 0.5, Settings.WORLD_UNITS * 0.5);
   
   const tribeInfo = TRIBE_INFO_RECORD[tribeType];
   for (let numAttempts = 0; numAttempts < 50; numAttempts++) {
      const biomeName = randItem(tribeInfo.biomes);
      const biomeTiles = getTilesOfBiome(surfaceLayer, biomeName);
      if (biomeTiles.length === 0) {
         continue;
      }

      const tileIndex = randItem(biomeTiles);

      const tileX = getTileX(tileIndex);
      const tileY = getTileY(tileIndex);
      const x = (tileX + Math.random()) * Settings.TILE_SIZE;
      const y = (tileY + Math.random()) * Settings.TILE_SIZE;

      if (x < PLAYER_SPAWN_POSITION_PADDING || x >= Settings.WORLD_UNITS - PLAYER_SPAWN_POSITION_PADDING || y < PLAYER_SPAWN_POSITION_PADDING || y >= Settings.WORLD_UNITS - PLAYER_SPAWN_POSITION_PADDING) {
         continue;
      }

      return new Point(x, y);
   }
   
   // If all else fails, just pick a random position
   const x = randInt(PLAYER_SPAWN_POSITION_PADDING, Settings.WORLD_SIZE_TILES * Settings.TILE_SIZE - PLAYER_SPAWN_POSITION_PADDING);
   const y = randInt(PLAYER_SPAWN_POSITION_PADDING, Settings.WORLD_SIZE_TILES * Settings.TILE_SIZE - PLAYER_SPAWN_POSITION_PADDING);
   return new Point(x, y);
}

export function processCommandPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }
   
   const command = reader.readString();
   registerCommand(command, playerClient);
}

const devGiveItem = (playerClient: PlayerClient, itemType: ItemType, amount: number): void => {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
   addItemToInventory(player, inventory, createItem(itemType, amount, "", ""));
}

const devSummonEntity = (playerClient: PlayerClient, summonPacket: EntitySummonPacket): void => {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   // @Incomplete

   // const config = createEntityConfig(summonPacket.entityType);
   // config.components[ServerComponentType.transform].position.x = summonPacket.position[0];
   // config.components[ServerComponentType.transform].position.y = summonPacket.position[1];
   // config.components[ServerComponentType.transform].rotation = summonPacket.rotation;

   // const inventoryComponentSummonData = summonPacket.summonData[ServerComponentType.inventory];
   // if (typeof inventoryComponentSummonData !== "undefined") {
   //    config.components[ServerComponentType.inventory].inventories
      
   //    const inventoryNames = Object.keys(inventoryComponentSummonData.itemSlots).map(Number) as Array<InventoryName>;
   //    for (let i = 0; i < inventoryNames.length; i++) {
   //       const inventoryName = inventoryNames[i];

   //       let inventory!: Inventory;
   //       const inventories = config.components[ServerComponentType.inventory].inventories;
   //       for (let i = 0; i < inventories.length; i++) {
   //          const currentInventory = inventories[i];
   //          if (currentInventory.name === inventoryName) {
   //             inventory =  currentInventory;
   //          }
   //       }
         
   //       const itemSlots = inventoryComponentSummonData.itemSlots[inventoryName]!;
   //       for (const [itemSlotString, itemData] of Object.entries(itemSlots) as Array<[string, Item]>) {
   //          const itemSlot = Number(itemSlotString);
            
   //          const item = createItem(itemData.type, itemData.count);
   //          inventory.addItem(item, itemSlot);
   //       }
   //    }
   // }

   // const tribeComponentSummonData = summonPacket.summonData[ServerComponentType.tribe];
   // if (typeof tribeComponentSummonData !== "undefined") {
   //    config.components[ServerComponentType.tribe].tribe = getTribe(tribeComponentSummonData.tribeID);
   // }

   // createEntityFromConfig(config, getEntityLayer(playerClient.instance), 0);
}

export function addPlayerClient(playerClient: PlayerClient, layer: Layer, spawnPosition: Point): void {
   playerClients.push(playerClient);

   const socket = playerClient.socket;

   const initialGameDataPacket = createInitialGameDataPacket(layer, spawnPosition);
   socket.send(initialGameDataPacket);

   socket.on("deactivate", () => {
      playerClient.isActive = false;
   });

   // -------------------------- //
   //       DEV-ONLY EVENTS      //
   // -------------------------- //

   socket.on("dev_give_item", (itemType: ItemType, amount: number): void => {
      devGiveItem(playerClient, itemType, amount);
   });

   socket.on("dev_summon_entity", (summonPacket: EntitySummonPacket): void => {
      devSummonEntity(playerClient, summonPacket);
   });
}




const shouldShowDamageNumber = (playerClient: PlayerClient, attackingEntity: Entity | null): boolean => {
   if (attackingEntity === null) {
      return false;
   }
   
   // Show damage from the player
   if (attackingEntity === playerClient.instance) {
      return true;
   }

   // Show damage from friendly turrets
   if (TurretComponentArray.hasComponent(attackingEntity)) {
      const tribeComponent = TribeComponentArray.getComponent(attackingEntity);
      if (tribeComponent.tribe === playerClient.tribe) {
         return true;
      }
   }

   return false;
}

const getPlayersViewingEntity = (entity: Entity): ReadonlyArray<PlayerClient> => {
   const viewingPlayerClients = new Array<PlayerClient>();
   // @Speed: will probs become a major source of slowness with 50+ players
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];
      if (playerClient.isActive && playerClient.visibleEntities.has(entity)) {
         viewingPlayerClients.push(playerClient);
      }
   }
   return viewingPlayerClients;
}

const getPlayersViewingPosition = (minX: number, maxX: number, minY: number, maxY: number): ReadonlyArray<PlayerClient> => {
   const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);

   const viewingPlayerClients = new Array<PlayerClient>();
   // @Speed: will probs become a major source of slowness with 50+ players
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];
      if (!playerClient.isActive) {
         continue;
      }
      if (minChunkX <= playerClient.maxVisibleChunkX && maxChunkX >= playerClient.minVisibleChunkX && minChunkY <= playerClient.maxVisibleChunkY && maxChunkY >= playerClient.minVisibleChunkY) {
         viewingPlayerClients.push(playerClient);
      }
   }
   return viewingPlayerClients;
}

export function registerEntityHit(hitEntity: Entity, hitHitbox: Hitbox, attackingEntity: Entity | null, hitPosition: Point, attackEffectiveness: AttackEffectiveness, damage: number, flags: number): void {
   const viewingPlayers = getPlayersViewingEntity(hitEntity);
   if (viewingPlayers.length === 0) {
      return;
   }
   
   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];

      const hitData: HitData = {
         hitEntity: hitEntity,
         hitHitbox: hitHitbox,
         hitPosition: hitPosition,
         attackEffectiveness: attackEffectiveness,
         damage: damage,
         shouldShowDamageNumber: shouldShowDamageNumber(playerClient, attackingEntity),
         flags: flags
      };
      playerClient.visibleHits.push(hitData);
   }
}

export function registerPlayerKnockback(player: Entity, knockback: Point): void {
   // @HACK: shouldn't convert to polar at all really, should just stay cartesian
   const polarVec = knockback.convertToVector();
   
   const knockbackData: PlayerKnockbackData = {
      knockback: polarVec.magnitude,
      knockbackDirection: polarVec.direction
   };

   const playerComponent = PlayerComponentArray.getComponent(player);
   playerComponent.client.playerKnockbacks.push(knockbackData);
}

export function registerEntityHeal(healedEntity: Entity, healer: Entity, healAmount: number): void {
   const viewingPlayers = getPlayersViewingEntity(healedEntity);
   if (viewingPlayers.length === 0) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(healedEntity);
   // @Hack
   const healedEntityHitbox = transformComponent.hitboxes[0];
   
   const healData: HealData = {
      entityPositionX: healedEntityHitbox.box.position.x,
      entityPositionY: healedEntityHitbox.box.position.y,
      healedID: healedEntity,
      healerID: healer,
      healAmount: healAmount
   };
   
   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.heals.push(healData);
   }
}

export function registerEntityDestruction(entity: Entity): void {
   const viewingPlayers = getPlayersViewingEntity(entity);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.visibleDestroyedEntities.push(entity);
   }
}

export function registerResearchOrbComplete(orbCompleteData: ResearchOrbCompleteData): void {
   const viewingPlayers = getPlayersViewingPosition(orbCompleteData.x, orbCompleteData.x, orbCompleteData.y, orbCompleteData.y);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.orbCompletes.push(orbCompleteData);
   }
}

export function registerEntityTickEvent(entity: Entity, tickEvent: EntityTickEvent): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const viewingPlayers = getPlayersViewingPosition(transformComponent.boundingAreaMinX, transformComponent.boundingAreaMaxX, transformComponent.boundingAreaMinY, transformComponent.boundingAreaMaxY);
   if (viewingPlayers.length === 0) {
      return;
   }

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.entityTickEvents.push(tickEvent);
   }
}

export function registerPlayerDroppedItemPickup(player: Entity): void {
   const playerComponent = PlayerComponentArray.getComponent(player);
   const playerClient = playerComponent.client;
   
   if (playerClient !== null) {
      playerClient.hasPickedUpItem = true;
   } else {
      console.warn("Couldn't find player to pickup item!");
   }
}

export function registerDirtyEntity(entity: Entity): void {
   if (dirtyEntities.has(entity)) {
      return;
   }
   dirtyEntities.add(entity);
   
   const viewingPlayers = getPlayersViewingEntity(entity);

   for (let i = 0; i < viewingPlayers.length; i++) {
      const playerClient = viewingPlayers[i];
      playerClient.visibleDirtiedEntities.push(entity);
   }
}

export function resetDirtyEntities(): void {
   dirtyEntities.clear();
}