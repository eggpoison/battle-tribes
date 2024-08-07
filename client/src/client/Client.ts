import { BuildingPlanData, PotentialBuildingPlanData, TribeWallData } from "webgl-test-shared/dist/ai-building-types";
import { AttackPacket, CircularHitboxData, ClientToServerEvents, EntityData, GameDataPacket, GameDataPacketOptions, GameDataSyncPacket, InitialGameDataPacket, PlayerDataPacket, PlayerInventoryData, RectangularHitboxData, RespawnDataPacket, ServerTileData, ServerTileUpdateData, ServerToClientEvents, VisibleChunkBounds } from "webgl-test-shared/dist/client-server-types";
import { distance, Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { BlueprintType, LimbData, ServerComponentType } from "webgl-test-shared/dist/components";
import { PlayerTribeData, TechID } from "webgl-test-shared/dist/techs";
import { STRUCTURE_TYPES } from "webgl-test-shared/dist/structures";
import { TRIBE_INFO_RECORD, TribeType } from "webgl-test-shared/dist/tribes";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { io, Socket } from "socket.io-client";
import { setGameState, setLoadingScreenInitialStatus } from "../components/App";
import Player from "../entities/Player";
import Game from "../Game";
import { Tile } from "../Tile";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import { removeSelectedItem, selectItem } from "../player-input";
import { Hotbar_setHotbarSelectedItemSlot, Hotbar_update, Hotbar_updateRightThrownBattleaxeItemID } from "../components/game/inventories/Hotbar";
import { HeldItem_setHeldItemCount, HeldItem_setHeldItemType } from "../components/game/HeldItem";
import { CraftingMenu_setCraftingMenuOutputItem, CraftingMenu_updateRecipes } from "../components/game/menus/CraftingMenu";
import { HealthBar_setHasFrostShield, updateHealthBar } from "../components/game/HealthBar";
import { registerServerTick, updateDebugScreenCurrentTime, updateDebugScreenIsPaused, updateDebugScreenTicks } from "../components/game/dev/GameInfoDisplay";
import Camera from "../Camera";
import { isDev } from "../utils";
import { updateRenderChunkFromTileUpdate } from "../rendering/render-chunks";
import Board from "../Board";
import { definiteGameState, latencyGameState } from "../game-state/game-states";
import { BackpackInventoryMenu_update } from "../components/game/inventories/BackpackInventory";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import Entity from "../Entity";
import { createDamageNumber, createHealNumber, createResearchNumber, setVisibleBuildingSafetys } from "../text-canvas";
import { playSound } from "../sound";
import { updateTechTree } from "../components/game/tech-tree/TechTree";
import { TechInfocard_setSelectedTech } from "../components/game/TechInfocard";
import { getSelectedEntityID } from "../entity-selection";
import { setVisiblePathfindingNodeOccupances } from "../rendering/webgl/pathfinding-node-rendering";
import { setVisibleSafetyNodes } from "../rendering/webgl/safety-node-rendering";
import { setVisibleRestrictedBuildingAreas } from "../rendering/webgl/restricted-building-areas-rendering";
import { setVisibleWallConnections } from "../rendering/webgl/wall-connection-rendering";
import OPTIONS from "../options";
import { Infocards_setTitleOffer } from "../components/game/infocards/Infocards";
import { calculateEntityRenderDepth } from "../render-layers";
import { GrassBlocker } from "webgl-test-shared/dist/grass-blockers";
import { createEntity } from "../entity-class-record";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { windowHeight, windowWidth } from "../webgl";
import { EntitySummonPacket } from "webgl-test-shared/dist/dev-packets";
import { CircularHitbox, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { InventoryName, Inventory, ItemType } from "webgl-test-shared/dist/items/items";
import { TitlesTab_setTitles } from "../components/game/dev/tabs/TitlesTab";
import { closeCurrentMenu } from "../menus";
import { TribesTab_refresh } from "../components/game/dev/tabs/TribesTab";
import { processTickEvents } from "../entity-tick-events";

type ISocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type GameData = {
   readonly gameTicks: number;
   readonly tiles: Array<Array<Tile>>;
   readonly playerID: number;
}

let visibleWalls: ReadonlyArray<TribeWallData>;
let buildingPlans: ReadonlyArray<BuildingPlanData>;

export function getVisibleWalls(): ReadonlyArray<TribeWallData> {
   return visibleWalls;
}

export function getVisibleBuildingPlans(): ReadonlyArray<BuildingPlanData> {
   return buildingPlans;
}

export function getHoveredBuildingPlan(): BuildingPlanData | null {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return null;
   }
   
   let minDist = 64;
   let closestPlanToCursor: BuildingPlanData | null = null;
   for (let i = 0; i < buildingPlans.length; i++) {
      const plan = buildingPlans[i];
      
      const cursorDist = distance(plan.x, plan.y, Game.cursorPositionX, Game.cursorPositionY);
      if (cursorDist < minDist) {
         minDist = cursorDist;
         closestPlanToCursor = plan;
      }
   }

   return closestPlanToCursor;
}

export interface PotentialPlanStats {
   readonly minSafety: number;
   readonly maxSafety: number;
}

export function getPotentialPlanStats(potentialPlans: ReadonlyArray<PotentialBuildingPlanData>): PotentialPlanStats {
   const firstPlan = potentialPlans[0];
   let minPlanSafety = firstPlan.safety;
   let maxPlanSafety = firstPlan.safety;
   for (let i = 1; i < potentialPlans.length; i++) {
      const potentialPlan = potentialPlans[i];
      if (potentialPlan.safety < minPlanSafety) {
         minPlanSafety = potentialPlan.safety;
      } else if (potentialPlan.safety > maxPlanSafety) {
         maxPlanSafety = potentialPlan.safety;
      }
   }

   return {
      minSafety: minPlanSafety,
      maxSafety: maxPlanSafety
   };
}

export function calculatePotentialPlanIdealness(potentialPlan: PotentialBuildingPlanData, potentialPlanStats: PotentialPlanStats): number {
   let idealness = (potentialPlan.safety - potentialPlanStats.minSafety) / (potentialPlanStats.maxSafety - potentialPlanStats.minSafety);
   if (isNaN(idealness)) {
      idealness = 1;
   }
   return idealness;
}

// @Cleanup
let grassBlockers: ReadonlyArray<GrassBlocker>;
export function getGrassBlockers(): ReadonlyArray<GrassBlocker> {
   return grassBlockers;
}

// @Cleanup: put these 2 in a more appropriate file

export function createCircularHitboxFromData(data: CircularHitboxData): CircularHitbox {
   const offset = new Point(data.offsetX, data.offsetY);
   return new CircularHitbox(data.mass, offset, data.collisionType, data.collisionBit, data.collisionMask, data.flags, data.radius);
}

export function createRectangularHitboxFromData(data: RectangularHitboxData): RectangularHitbox {
   const offset = new Point(data.offsetX, data.offsetY);
   return new RectangularHitbox(data.mass, offset, data.collisionType, data.collisionBit, data.collisionMask, data.flags, data.width, data.height, data.rotation);
}

abstract class Client {
   private static socket: ISocket | null = null;

   public static connectToServer(): Promise<boolean> {
      return new Promise(resolve => {
         let socketAlreadyExists = false;

         // Don't add events if the socket already exists
         if (this.socket !== null) {
            socketAlreadyExists = true;
            
            // Reconnect
            if (!this.socket.connected) {
               this.socket.connect();
            }

            this.socket.off("connect");
            this.socket.off("connect_error");
         } else {
            // Create the socket
            this.socket = this.createSocket();
            this.socket.connect();
         }

         // If connection was successful, return true
         this.socket.on("connect", () => {
            resolve(true);
         });
         // If couldn't connect to server, return false
         this.socket.on("connect_error", (err) => {
            console.log(err);
            resolve(false);
         });
         
         if (!socketAlreadyExists) {
            this.socket.on("game_data_packet", gameDataPacket => {
               // Only unload game packets when the game is running
               if (Game.getIsPaused() || !Game.isRunning || !Game.isSynced || document.visibilityState === "hidden") return;

               registerServerTick();

               Game.queuedPackets.push(gameDataPacket);
            });
   
            // When the connection to the server fails
            this.socket.on("disconnect", disconnectReason => {
               // Don't show a connection error if the socket was disconnected manually
               if (disconnectReason === "io client disconnect") return;

               console.warn(disconnectReason);

               Game.isRunning = false;
               
               setLoadingScreenInitialStatus("connection_error");
               setGameState("loading");

               Player.instance = null;
            });

            this.socket.on("game_data_sync_packet", (gameDataSyncPacket: GameDataSyncPacket) => {
               this.registerGameDataSyncPacket(gameDataSyncPacket);
            });

            this.socket.on("respawn_data_packet", (respawnDataPacket: RespawnDataPacket): void => {
               this.respawnPlayer(respawnDataPacket);
            });

            this.socket.on("force_position_update", (position: [number, number]): void => {
               if (Player.instance !== null) {
                  Player.instance.position.x = position[0];
                  Player.instance.position.y = position[1];
               }
            })
         }
      });
   }

   // public static async requestInitialGameData(): Promise<InitialGameDataPacket> {
   //    return new Promise(resolve => {
   //       if (this.socket === null) throw new Error("Socket hadn't been created when requesting game data")

   //       this.socket.emit("initial_game_data_request");
         
   //       this.socket.off("initial_game_data_packet");
   //       this.socket.on("initial_game_data_packet", (initialGameDataPacket: InitialGameDataPacket) => {
   //          resolve(initialGameDataPacket);
   //       });
   //    });
   // }

   public static getInitialGameDataPacket(): Promise<InitialGameDataPacket> {
      return new Promise(resolve => {
         if (this.socket === null) {
            throw new Error();
         }

         this.socket.once("initial_game_data_packet", initialGameDataPacket => {
            resolve(initialGameDataPacket);
         });
      })
   }

   public static getNextGameDataPacket(): Promise<GameDataPacket> {
      return new Promise(resolve => {
         if (this.socket === null) {
            throw new Error();
         }

         this.socket.once("game_data_packet", gameDataPacket => {
            resolve(gameDataPacket);
         });
      })
   }

   /** Creates the socket used to connect to the server */
   private static createSocket(): ISocket {
      return io(`ws://localhost:${Settings.SERVER_PORT}`, {
         transports: ["websocket", "polling", "flashsocket"],
         autoConnect: false,
         reconnection: false
      });
   }

   public static disconnect(): void {
      if (this.socket === null) {
         throw new Error("Tried to disconnect a socket which doesn't exist");
      }

      this.socket.disconnect();
      this.socket = null;
   }

   /** Parses the server tile data array into an array of client tiles */
   public static parseServerTileDataArray(serverTileDataArray: ReadonlyArray<ServerTileData>): Array<Array<Tile>> {
      const tiles = new Array<Array<Tile>>();
   
      for (let tileIndex = 0; tileIndex < Settings.BOARD_DIMENSIONS * Settings.BOARD_DIMENSIONS; tileIndex++) {
         const serverTileData = serverTileDataArray[tileIndex];
         
         const x = tileIndex % Settings.BOARD_DIMENSIONS;
         const y = Math.floor(tileIndex / Settings.BOARD_DIMENSIONS);
         if (typeof tiles[x] === "undefined") {
            tiles.push([]);
         }

         const tile = new Tile(x, y, serverTileData.type, serverTileData.biome, serverTileData.isWall);
         tiles[x].push(tile);
      }
   
      return tiles;
   }

   public static processGameDataPacket(gameDataPacket: GameDataPacket): void {
      Board.ticks = gameDataPacket.serverTicks;
      updateDebugScreenTicks(gameDataPacket.serverTicks);
      Board.time = gameDataPacket.serverTime;
      updateDebugScreenCurrentTime(gameDataPacket.serverTime);
      updateDebugScreenIsPaused(gameDataPacket.simulationIsPaused);

      if (isDev()) {
         Game.setGameObjectDebugData(gameDataPacket.entityDebugData);
      }

      this.updateTribe(gameDataPacket.playerTribeData);
      Game.enemyTribes = gameDataPacket.enemyTribesData;
      // @Hack: shouldn't do always
      TribesTab_refresh();

      Infocards_setTitleOffer(gameDataPacket.titleOffer);

      processTickEvents(gameDataPacket.tickEvents);

      this.updateEntities(gameDataPacket.entityDataArray, gameDataPacket.visibleEntityDeathIDs);
      
      this.updatePlayerInventory(gameDataPacket.inventory);
      this.registerTileUpdates(gameDataPacket.tileUpdates);

      definiteGameState.setPlayerHealth(gameDataPacket.playerHealth);
      if (Player.instance !== null && definiteGameState.playerIsDead()) {
         this.killPlayer();
      }

      HealthBar_setHasFrostShield(gameDataPacket.hasFrostShield);

      // Register hits
      for (const hitData of gameDataPacket.visibleHits) {
         // Register hit
         const hitEntity = Board.entityRecord[hitData.hitEntityID];
         if (typeof hitEntity !== "undefined") {
            if (hitData.attackEffectiveness === AttackEffectiveness.stopped) {
               hitEntity.registerStoppedHit(hitData);
            } else {
               hitEntity.registerHit(hitData);
            }
         }

         if (hitData.damage > 0 && hitData.shouldShowDamageNumber) {
            createDamageNumber(hitData.hitPosition[0], hitData.hitPosition[1], hitData.damage);
         }
      }

      if (Player.instance !== null) {
         const physicsComponent = Player.instance.getServerComponent(ServerComponentType.physics);
         // Register player knockback
         for (let i = 0; i < gameDataPacket.playerKnockbacks.length; i++) {
            const knockbackData = gameDataPacket.playerKnockbacks[i];
            
            physicsComponent.velocity.x *= 0.5;
            physicsComponent.velocity.y *= 0.5;
   
            physicsComponent.velocity.x += knockbackData.knockback * Math.sin(knockbackData.knockbackDirection);
            physicsComponent.velocity.y += knockbackData.knockback * Math.cos(knockbackData.knockbackDirection);
         }
      }

      // Register heals
      for (const healData of gameDataPacket.heals) {
         if (healData.healAmount === 0) {
            continue;
         }

         if (Player.instance !== null && healData.healerID === Player.instance.id) {
            createHealNumber(healData.healedID, healData.entityPositionX, healData.entityPositionY, healData.healAmount);
         }

         const healedEntity = Board.entityRecord[healData.healedID];
         if (typeof healedEntity !== "undefined") {
            healedEntity.createHealingParticles(healData.healAmount);

            // @Hack @Incomplete: This will trigger the repair sound effect even if a hammer isn't the one healing the structure
            if (STRUCTURE_TYPES.includes(healedEntity.type as any)) { // @Cleanup
               playSound("repair.mp3", 0.4, 1, healData.entityPositionX, healData.entityPositionY);
            }
         }
      }

      // Register orb completes
      for (const orbCompleteData of gameDataPacket.orbCompletes) {
         createResearchNumber(orbCompleteData.x, orbCompleteData.y, orbCompleteData.amount);
      }

      if (gameDataPacket.pickedUpItem) {
         playSound("item-pickup.mp3", 0.3, 1, Camera.position.x, Camera.position.y);
      }

      definiteGameState.hotbarCrossbowLoadProgressRecord = gameDataPacket.hotbarCrossbowLoadProgressRecord;

      setVisiblePathfindingNodeOccupances(gameDataPacket.visiblePathfindingNodeOccupances);
      setVisibleSafetyNodes(gameDataPacket.visibleSafetyNodes);
      setVisibleBuildingSafetys(gameDataPacket.visibleBuildingSafetys);
      setVisibleRestrictedBuildingAreas(gameDataPacket.visibleRestrictedBuildingAreas);
      setVisibleWallConnections(gameDataPacket.visibleWallConnections);

      buildingPlans = gameDataPacket.visibleBuildingPlans;
      visibleWalls = gameDataPacket.visibleWalls;
      grassBlockers = gameDataPacket.visibleGrassBlockers;
   }

   private static updateTribe(tribeData: PlayerTribeData): void {
      if (tribeData.unlockedTechs.length > Game.tribe.unlockedTechs.length) {
         // @Incomplete: attach to camera so it doesn't decrease in loudness
         playSound("research.mp3", 0.4, 1, Camera.position.x, Camera.position.y);
      }
      
      Game.tribe.hasTotem = tribeData.hasTotem;
      Game.tribe.numHuts = tribeData.numHuts;
      Game.tribe.selectedTechID = tribeData.selectedTechID;
      Game.tribe.unlockedTechs = tribeData.unlockedTechs;
      Game.tribe.techTreeUnlockProgress = tribeData.techTreeUnlockProgress;

      updateTechTree();
      TechInfocard_setSelectedTech(Game.tribe.selectedTechID);
   }

   /**
    * Updates the client's entities to match those in the server
    */
   private static updateEntities(entityDataArray: Array<EntityData<EntityType>>, entityDeathIDs: ReadonlyArray<number>): void {
      // @Speed
      const knownEntityIDs = new Set(Object.keys(Board.entityRecord).map(idString => Number(idString)));
      
      // Remove the player from the list of known entities so the player isn't removed
      if (Player.instance !== null) {
         knownEntityIDs.delete(Player.instance.id);
      }

      // @Cleanup: This feels wrong to do. This hardcodes which components are updated from server data; is that correct to do?
      // Remove the player so it doesn't get updated from the server data
      // @Speed
      for (let i = 0; i < entityDataArray.length; i++) {
         const data = entityDataArray[i];
         if (data.id === Game.playerID) {
            if (Player.instance === null) {
               const player = this.createEntityFromData(data) as Player;
               Player.createInstancePlayer(player);
            } else {
               
               // @Hack @Cleanup
               for (let i = 0; i < data.components.length; i++) {
                  const componentData = data.components[i];

                  switch (componentData.componentType) {
                     case ServerComponentType.statusEffect: {
                        Player.instance.getServerComponent(ServerComponentType.statusEffect).updateFromData(componentData);
                        break;
                     }
                     case ServerComponentType.tribeMember: {
                        const tribeMemberComponent = Player.instance.getServerComponent(ServerComponentType.tribeMember);
                        tribeMemberComponent.updateFromData(componentData);

                        TitlesTab_setTitles(tribeMemberComponent.getTitles());
                        break;
                     }
                     case ServerComponentType.inventoryUse: {
                        let hotbarUseInfo: LimbData | undefined;
                        for (let i = 0; i < componentData.inventoryUseInfos.length; i++) {
                           const useInfo = componentData.inventoryUseInfos[i];
                           if (useInfo.inventoryName === InventoryName.hotbar) {
                              hotbarUseInfo = useInfo;
                              break;
                           }
                        }
                        if (typeof hotbarUseInfo === "undefined") {
                           throw new Error();
                        }
         
                        const inventoryUseComponent = Player.instance.getServerComponent(ServerComponentType.inventoryUse);
                        inventoryUseComponent.getUseInfo(InventoryName.hotbar).thrownBattleaxeItemID = hotbarUseInfo.thrownBattleaxeItemID;
                        
                        Hotbar_updateRightThrownBattleaxeItemID(hotbarUseInfo.thrownBattleaxeItemID);
                        
                        break;
                     }
                  }
               }

               // @Incomplete
               // const leftThrownBattleaxeItemID = entityData.clientArgs[14] as number;
               // player.leftThrownBattleaxeItemID = leftThrownBattleaxeItemID;
               // Hotbar_updateLeftThrownBattleaxeItemID(leftThrownBattleaxeItemID);

               Player.instance.collisionMask = data.collisionMask;
               
               entityDataArray.splice(i, 1);
            }
            break;
         }
      }

      // Update the game entities
      for (const entityData of entityDataArray) {
         // If it already exists, update it
         const entity = Board.entityRecord[entityData.id];
         if (typeof entity !== "undefined") {
            entity.updateFromData(entityData);
         } else {
            this.createEntityFromData(entityData);
         }

         knownEntityIDs.delete(entityData.id);
      }

      // All known entity ids which haven't been removed are ones which are dead
      for (const id of knownEntityIDs) {
         const isDeath = entityDeathIDs.indexOf(id) !== -1;
         const entity = Board.entityRecord[id]!;
         Board.removeEntity(entity, isDeath);
      }
   }

   private static updatePlayerInventory(playerInventoryData: PlayerInventoryData) {
      // Call the remove function if the selected item has been removed, and the select function for new selected item slots
      const previouslySelectedItem = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
      if (typeof previouslySelectedItem !== "undefined" && !playerInventoryData.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot)) {
         removeSelectedItem(previouslySelectedItem);
      } else {
         const newSelectedItem = playerInventoryData.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
         if (!definiteGameState.hotbar.itemSlots.hasOwnProperty(latencyGameState.selectedHotbarItemSlot) && typeof newSelectedItem !== "undefined") {
            selectItem(newSelectedItem);
         }
      }

      const hotbarHasChanged = this.inventoryHasChanged(definiteGameState.hotbar, playerInventoryData.hotbar);
      updateInventoryFromData(definiteGameState.hotbar, playerInventoryData.hotbar);

      const backpackHasChanged = this.inventoryHasChanged(definiteGameState.backpack, playerInventoryData.backpackInventory);
      if (definiteGameState.backpack !== null) {
         updateInventoryFromData(definiteGameState.backpack, playerInventoryData.backpackInventory);
      } else {
         definiteGameState.backpack = createInventoryFromData(playerInventoryData.backpackInventory);
      }

      // Crafting output item
      updateInventoryFromData(definiteGameState.craftingOutputSlot, playerInventoryData.craftingOutputItemSlot);
      CraftingMenu_setCraftingMenuOutputItem(definiteGameState.craftingOutputSlot?.itemSlots[1] || null);

      // Backpack slot
      const backpackSlotHasChanged = this.inventoryHasChanged(definiteGameState.backpackSlot, playerInventoryData.backpackSlot);
      updateInventoryFromData(definiteGameState.backpackSlot, playerInventoryData.backpackSlot);

      // Held item
      updateInventoryFromData(definiteGameState.heldItemSlot, playerInventoryData.heldItemSlot);
      const heldItem = definiteGameState.heldItemSlot.itemSlots[1];
      if (typeof heldItem !== "undefined") {
         HeldItem_setHeldItemCount(heldItem.count);
         HeldItem_setHeldItemType(heldItem.type);
      } else {
         HeldItem_setHeldItemType(null);
      }

      // Armour slot
      const armourSlotHasChanged = this.inventoryHasChanged(definiteGameState.armourSlot, playerInventoryData.armourSlot);
      updateInventoryFromData(definiteGameState.armourSlot, playerInventoryData.armourSlot);

      // Glove slot
      const gloveSlotHasChanged = this.inventoryHasChanged(definiteGameState.gloveSlot, playerInventoryData.gloveSlot);
      updateInventoryFromData(definiteGameState.gloveSlot, playerInventoryData.gloveSlot);

      // Offhand
      const offhandHasChanged = this.inventoryHasChanged(definiteGameState.offhandInventory, playerInventoryData.offhand);
      updateInventoryFromData(definiteGameState.offhandInventory, playerInventoryData.offhand);
      
      if (Player.instance !== null) {
         const inventoryComponent = Player.instance.getServerComponent(ServerComponentType.inventory);
         if (hotbarHasChanged) {
            updateInventoryFromData(inventoryComponent.getInventory(InventoryName.hotbar), playerInventoryData.hotbar);
         }
         if (offhandHasChanged) {
            updateInventoryFromData(inventoryComponent.getInventory(InventoryName.offhand), playerInventoryData.offhand);
         }
         if (armourSlotHasChanged) {
            updateInventoryFromData(inventoryComponent.getInventory(InventoryName.armourSlot), playerInventoryData.armourSlot);
         }
         if (gloveSlotHasChanged) {
            updateInventoryFromData(inventoryComponent.getInventory(InventoryName.gloveSlot), playerInventoryData.gloveSlot);
         }
      }

      if (hotbarHasChanged || backpackSlotHasChanged || armourSlotHasChanged || offhandHasChanged || gloveSlotHasChanged) {
         Hotbar_update();
      }
      if (backpackHasChanged || backpackSlotHasChanged) {
         BackpackInventoryMenu_update();
      }
      if (hotbarHasChanged || backpackHasChanged) {
         CraftingMenu_updateRecipes();
      }
   }

   private static inventoryHasChanged(previousInventory: Inventory | null, newInventoryData: Inventory): boolean {
      // If the previous inventory is null, check if there are any items in the new inventory data
      if (previousInventory === null) {
         for (let itemSlot = 1; itemSlot <= newInventoryData.width * newInventoryData.height; itemSlot++) {
            if (newInventoryData.itemSlots.hasOwnProperty(itemSlot)) {
               return true;
            }
         }
         return false;
      }
      
      for (let itemSlot = 1; itemSlot <= newInventoryData.width * newInventoryData.height; itemSlot++) {
         const newItem = newInventoryData.itemSlots[itemSlot];
         if (typeof newItem === "undefined") {
            // If there is no item in the server data but there is one in the game state
            if (previousInventory.itemSlots.hasOwnProperty(itemSlot)) {
               return true;
            }

            // Since we then know both inventories don't have an item there, we don't do any other checks
            continue;
         }

         // If the item has changed, update it
         const previousItem = previousInventory.itemSlots[itemSlot];
         if (typeof previousItem !== "undefined") {
            // Update type
            if (newItem.type !== previousItem.type) {
               return true;
            }
            // Update count
            if (newItem.count !== previousItem.count) {
               return true;
            }
         } else {
            // Server inventory data has item but game state doesn't
            return true;
         }
      }
      return false;
   }

   private static createEntityFromData(entityData: EntityData): Entity {
      // Create the entity
      const entity = createEntity(entityData);

      // @Cleanup: initialise the value in the constructor
      entity.renderDepth = calculateEntityRenderDepth(entity.type);
      
      entity.createComponents(entityData.components);
      entity.callOnLoadFunctions();
      
      entity.rotation = entityData.rotation;
      entity.collisionBit = entityData.collisionBit;
      entity.collisionMask = entityData.collisionMask;

      this.addHitboxesToEntity(entity, entityData);

      Board.addEntity(entity);

      if (entityData.type === EntityType.player) {
         Board.players.push(entity as Player);
      }

      return entity;
   }
   
   private static registerTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const tileUpdate of tileUpdates) {
         const tileX = tileUpdate.tileIndex % Settings.BOARD_DIMENSIONS;
         const tileY = Math.floor(tileUpdate.tileIndex / Settings.BOARD_DIMENSIONS);
         const tile = Board.getTile(tileX, tileY);
         tile.type = tileUpdate.type;
         tile.isWall = tileUpdate.isWall;
         
         updateRenderChunkFromTileUpdate(tileUpdate);
      }
   }

   private static addHitboxesToEntity(entity: Entity, data: EntityData): void {
      for (let i = 0; i < data.circularHitboxes.length; i++) {
         const hitboxData = data.circularHitboxes[i];

         const hitbox = createCircularHitboxFromData(hitboxData);
         entity.addHitbox(hitbox, hitboxData.localID);
      }

      for (let i = 0; i < data.rectangularHitboxes.length; i++) {
         const hitboxData = data.rectangularHitboxes[i];

         const hitbox = createRectangularHitboxFromData(hitboxData);
         entity.addHitbox(hitbox, hitboxData.localID);
      }
   }

   private static registerGameDataSyncPacket(gameDataSyncPacket: GameDataSyncPacket): void {
      if (!Game.isRunning) return;

      if (Player.instance !== null) {
         Player.instance.position = Point.unpackage(gameDataSyncPacket.position);
         Player.instance.rotation = gameDataSyncPacket.rotation;
         this.updatePlayerInventory(gameDataSyncPacket.inventory);

         const physicsComponent = Player.instance.getServerComponent(ServerComponentType.physics);
         physicsComponent.velocity.x = gameDataSyncPacket.velocity[0];
         physicsComponent.velocity.y = gameDataSyncPacket.velocity[1];
         physicsComponent.acceleration.x = gameDataSyncPacket.acceleration[0];
         physicsComponent.acceleration.y = gameDataSyncPacket.acceleration[1];
         
         definiteGameState.setPlayerHealth(gameDataSyncPacket.health);
         if (definiteGameState.playerIsDead()) {
            this.killPlayer();
         }
      }

      Game.sync();
   }

   private static respawnPlayer(respawnDataPacket: RespawnDataPacket): void {
      latencyGameState.selectedHotbarItemSlot = 1;
      Hotbar_setHotbarSelectedItemSlot(1);
      
      const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;
      definiteGameState.setPlayerHealth(maxHealth);
      updateHealthBar(maxHealth);
      
      // const spawnPosition = Point.unpackage(respawnDataPacket.spawnPosition);
      // Player.createInstancePlayer(spawnPosition, respawnDataPacket.playerID);

      gameScreenSetIsDead(false);

      // Clear any queued packets, as they contain data from when the player wasn't respawned.
      Game.queuedPackets.splice(0, Game.queuedPackets.length);
   }

   /**
    * Sends a message to all players in the server.
    * @param message The message to send to the other players
    */
   public static sendChatMessage(message: string): void {
      // Send the chat message to the server
      if (this.socket !== null) {
         this.socket.emit("chat_message", message);
      }
   }

   public static sendInitialPlayerData(username: string, tribeType: TribeType): void {
      // Send player data to the server
      if (this.socket !== null) {
         this.socket.emit("initial_player_data", username, tribeType, windowWidth, windowHeight);
      }
   }

   public static sendVisibleChunkBounds(visibleChunks: VisibleChunkBounds): void {
      // Send player data to the server
      if (this.socket !== null) {
         this.socket.emit("visible_chunk_bounds", visibleChunks);
      }
   }

   public static sendPlayerDataPacket(): void {
      if (Game.isRunning && this.socket !== null && Player.instance !== null) {
         let interactingEntityID = -1;
         const selectedEntityID = getSelectedEntityID();

         const selectedEntity = Board.entityRecord[selectedEntityID];
         if (typeof selectedEntity !== "undefined") {
            if (selectedEntity.type === EntityType.tribeWorker || selectedEntity.type === EntityType.tribeWarrior) {
               interactingEntityID = selectedEntity.id;
            }
         }

         let gameDataOptions = 0;
         if (OPTIONS.showPathfindingNodes) {
            gameDataOptions |= GameDataPacketOptions.sendVisiblePathfindingNodeOccupances;
         }
         if (OPTIONS.showSafetyNodes) {
            gameDataOptions |= GameDataPacketOptions.sendVisibleSafetyNodes;
         }
         if (OPTIONS.showBuildingPlans) {
            gameDataOptions |= GameDataPacketOptions.sendVisibleBuildingPlans;
         }
         if (OPTIONS.showBuildingSafetys) {
            gameDataOptions |= GameDataPacketOptions.sendVisibleBuildingSafetys;
         }
         if (OPTIONS.showRestrictedAreas) {
            gameDataOptions |= GameDataPacketOptions.sendVisibleRestrictedBuildingAreas;
         }
         if (OPTIONS.showWallConnections) {
            gameDataOptions |= GameDataPacketOptions.sendVisibleWallConnections;
         }
         // @Incomplete: do option for walls

         const physicsComponent = Player.instance.getServerComponent(ServerComponentType.physics);
         
         const packet: PlayerDataPacket = {
            position: Player.instance.position.package(),
            velocity: physicsComponent.velocity.package() || null,
            acceleration: physicsComponent.acceleration.package() || null,
            rotation: Player.instance.rotation,
            visibleChunkBounds: Camera.getVisibleChunkBounds(),
            selectedItemSlot: latencyGameState.selectedHotbarItemSlot,
            mainAction: latencyGameState.mainAction,
            offhandAction: latencyGameState.offhandAction,
            interactingEntityID: interactingEntityID,
            gameDataOptions: gameDataOptions
         };

         this.socket.emit("player_data_packet", packet);
      }
   }

   public static sendCraftingPacket(recipeIndex: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("crafting_packet", recipeIndex);
      }
   }

   public static sendItemPickupPacket(entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_pickup", entityID, inventoryName, itemSlot, amount);
      }
   }

   public static sendItemReleasePacket(entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_release", entityID, inventoryName, itemSlot, amount);
      }
   }

   public static sendAttackPacket(attackPacket: AttackPacket): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("attack_packet", attackPacket);
      }
   }

   public static sendItemUsePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         const itemSlot = latencyGameState.selectedHotbarItemSlot;
         this.socket.emit("item_use_packet", itemSlot);
      }
   }

   public static sendHeldItemDropPacket(dropAmount: number, dropDirection: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("held_item_drop", dropAmount, dropDirection);
      }
   }

   public static sendItemDropPacket(itemSlot: number, dropAmount: number, dropDirection: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("item_drop", itemSlot, dropAmount, dropDirection);
      }
   }

   public static sendDeactivatePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("deactivate");
      }
   }

   public static sendActivatePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("activate");
      }
   }

   public static sendRespawnRequest(): void {
      if (Game.isRunning && Client.socket !== null) {
         Client.socket.emit("respawn");
      }
   }

   public static sendCommand(command: string): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("command", command);
      }
   }

   public static sendTrackEntity(id: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("track_game_object", id);
      }
   }

   private static killPlayer(): void {
      // Remove the player from the game
      Board.removeEntity(Player.instance!, true);
      Player.instance = null;

      latencyGameState.resetFlags();
      definiteGameState.resetFlags();

      gameScreenSetIsDead(true);
      closeCurrentMenu();
   }

   public static sendSelectTech(techID: TechID): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("select_tech", techID);
      }
   }

   public static sendUnlockTech(techID: TechID): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("unlock_tech", techID);
      }
   }

   public static sendForceUnlockTech(techID: TechID): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("force_unlock_tech", techID);
      }
   }

   public static sendStudyTech(studyAmount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("study_tech", studyAmount);
      }
   }

   // @Cleanup: either make this.socket always not null or use a decorator.

   public static sendPlaceBlueprint(structureID: number, blueprintType: BlueprintType): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("place_blueprint", structureID, blueprintType);
      }
   }

   public static sendModifyBuilding(structureID: number, data: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("modify_building", structureID, data);
      }
   }

   public static sendDeconstructBuilding(structureID: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("deconstruct_building", structureID);
      }
   }

   public static sendStructureInteract(structureID: number, interactData: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("structure_interact", structureID, interactData);
      }
   }

   public static sendStructureUninteract(structureID: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("structure_uninteract", structureID);
      }
   }

   public static sendRecruitTribesman(tribesmanID: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("recruit_tribesman", tribesmanID);
      }
   }

   public static respondToTitleOffer(title: TribesmanTitle, isAccepted: boolean): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("respond_to_title_offer", title, isAccepted);
      }
   }

   public static sendEntitySummonPacket(summonPacket: EntitySummonPacket): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("dev_summon_entity", summonPacket);
      }
   }

   public static sendDevGiveItemPacket(itemType: ItemType, amount: number): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("dev_give_item", itemType, amount);
      }
   }

   public static sendDevGiveTitlePacket(title: TribesmanTitle): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("dev_give_title", title);
      }
   }

   public static sendDevRemoveTitlePacket(title: TribesmanTitle): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("dev_remove_title", title);
      }
   }

   public static sendDevPauseSimulation(): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("dev_pause_simulation");
      }
   }

   public static sendDevUnpauseSimulation(): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("dev_unpause_simulation");
      }
   }

   public static sendDevCreateTribe(): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("dev_create_tribe");
      }
   }

   public static sendDevChangeTribeType(tribeID: number, newTribeType: TribeType): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.emit("dev_change_tribe_type", tribeID, newTribeType);
      }
   }
}

export default Client;