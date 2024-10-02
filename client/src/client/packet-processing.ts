import { WaterRockData, RiverSteppingStoneData, GrassTileInfo, RiverFlowDirectionsRecord, WaterRockSize, RiverSteppingStoneSize, GameDataPacket, HitData, PlayerKnockbackData, HealData, ResearchOrbCompleteData, ServerTileUpdateData, EntityDebugData, LineDebugData, CircleDebugData, TileHighlightData, PathData, PathfindingNodeIndex, RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { ItemType } from "battletribes-shared/items/items";
import { PacketReader } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { Biome, TileType } from "battletribes-shared/tiles";
import { readCrossbowLoadProgressRecord } from "../entity-components/InventoryUseComponent";
import { TribesmanTitle } from "battletribes-shared/titles";
import { ItemRequirements } from "battletribes-shared/items/crafting-recipes";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { EnemyTribeData, PlayerTribeData, TechID, TechTreeUnlockProgress } from "battletribes-shared/techs";
import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import Game from "../Game";
import Player from "../entities/Player";
import Client, { getQueuedGameDataPackets } from "./Client";
import Entity from "../Entity";
import { createEntity } from "../entity-class-record";
import Board from "../Board";
import Camera from "../Camera";
import { updateDebugScreenIsPaused, updateDebugScreenTicks, updateDebugScreenCurrentTime, registerServerTick } from "../components/game/dev/GameInfoDisplay";
import { Tile } from "../Tile";
import { getServerComponentArray } from "../entity-components/ComponentArray";
import { TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import { updateHealthBar } from "../components/game/HealthBar";
import { selectItemSlot } from "../components/game/GameInteractableLayer";
import { createComponent } from "../entity-components/component-creation";
import { addEntity, addLayer, changeEntityLayer, entityExists, getEntityByID, getEntityLayer, layers, removeEntity, setCurrentLayer } from "../world";
import { NEIGHBOUR_OFFSETS } from "../utils";
import { createRiverSteppingStoneData } from "../rendering/webgl/river-rendering";
import Layer, { getTileIndexIncludingEdges, tileIsWithinEdge } from "../Layer";
import { TransformComponentArray } from "../entity-components/TransformComponent";
import { playSound } from "../sound";

export function processInitialGameDataPacket(reader: PacketReader): void {
   // Player ID
   // @Hack: Is this really necessary?
   Game.playerID = reader.readNumber();

   const layerIdx = reader.readNumber();
   
   const spawnPositionX = reader.readNumber();
   const spawnPositionY = reader.readNumber();
   
   // Create layers
   const numLayers = reader.readNumber();
   for (let i = 0; i < numLayers; i++) {
      const tiles = new Array<Tile>();
      const flowDirections: RiverFlowDirectionsRecord = {};
      const grassInfoRecord: Record<number, Record<number, GrassTileInfo>> = {};
      for (let tileIndex = 0; tileIndex < Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS; tileIndex++) {
         const tileType = reader.readNumber() as TileType;
         const tileBiome = reader.readNumber() as Biome;
         const isWall = reader.readBoolean();
         reader.padOffset(3);
         const flowDirection = reader.readNumber();
         const temperature = reader.readNumber();
         const humidity = reader.readNumber();
   
         const tileX = Board.getTileX(tileIndex);
         const tileY = Board.getTileY(tileIndex);
   
         const tile = new Tile(tileX, tileY, tileType, tileBiome, isWall);
         tiles.push(tile);
   
         if (typeof flowDirections[tileX] === "undefined") {
            flowDirections[tileX] = {};
         }
         flowDirections[tileX]![tileY] = flowDirection;
   
         const grassInfo: GrassTileInfo = {
            tileX: tileX,
            tileY: tileY,
            temperature: temperature,
            humidity: humidity
         };
         if (typeof grassInfoRecord[tileX] === "undefined") {
            grassInfoRecord[tileX] = {};
         }
         grassInfoRecord[tileX]![tileY] = grassInfo;
      }

      // Flag all tiles which border water or walls
      for (let i = 0; i < tiles.length; i++) {
         const tile = tiles[i];
         if (tile.isWall) {
            const tileX = i % (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2) - Settings.EDGE_GENERATION_DISTANCE;
            const tileY = Math.floor(i / (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2)) - Settings.EDGE_GENERATION_DISTANCE;

            for (let j = 0; j < NEIGHBOUR_OFFSETS.length; j++) {
               const neighbourTileX = tileX + NEIGHBOUR_OFFSETS[j][0];
               const neighbourTileY = tileY + NEIGHBOUR_OFFSETS[j][1];

               if (tileIsWithinEdge(neighbourTileX, neighbourTileY)) {
                  const tileIndex = getTileIndexIncludingEdges(neighbourTileX, neighbourTileY);
                  const neighbourTile = tiles[tileIndex];
                  neighbourTile.bordersWall = true;
               }
            }
         }

         if (tile.type === TileType.water) {
            const tileX = i % (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2) - Settings.EDGE_GENERATION_DISTANCE;
            const tileY = Math.floor(i / (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2)) - Settings.EDGE_GENERATION_DISTANCE;

            for (let j = 0; j < NEIGHBOUR_OFFSETS.length; j++) {
               const neighbourTileX = tileX + NEIGHBOUR_OFFSETS[j][0];
               const neighbourTileY = tileY + NEIGHBOUR_OFFSETS[j][1];

               if (tileIsWithinEdge(neighbourTileX, neighbourTileY)) {
                  const tileIndex = getTileIndexIncludingEdges(neighbourTileX, neighbourTileY);
                  const neighbourTile = tiles[tileIndex];
                  neighbourTile.bordersWater = true;
               }
            }
         }
      }

      const layer = new Layer(tiles, flowDirections, [], [], grassInfoRecord);
      addLayer(layer);
   }

   // Set the initial camera position
   Camera.setPosition(spawnPositionX, spawnPositionY);
   Camera.setInitialVisibleChunkBounds(layers[layerIdx]);

   // @Temporary @Hack
   setCurrentLayer(0);

   // @Hack
   const surfaceLayer = layers[0];

   const numWaterRocks = reader.readNumber();
   for (let i = 0; i < numWaterRocks; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const rotation = reader.readNumber();
      const size = reader.readNumber() as WaterRockSize;
      const opacity = reader.readNumber();

      const waterRock: WaterRockData = {
         position: [x, y],
         rotation: rotation,
         size: size,
         opacity: opacity
      };
      surfaceLayer.waterRocks.push(waterRock);
   }

   const numSteppingStones = reader.readNumber();
   for (let i = 0; i < numSteppingStones; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const rotation = reader.readNumber();
      const size = reader.readNumber() as RiverSteppingStoneSize;
      const groupID = reader.readNumber();

      const steppingStone: RiverSteppingStoneData = {
         positionX: x,
         positionY: y,
         rotation: rotation,
         size: size,
         groupID: groupID
      };
      surfaceLayer.riverSteppingStones.push(steppingStone);
   }

   // Add river stepping stones to chunks
   for (const steppingStone of surfaceLayer.riverSteppingStones) {
      const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];

      const minChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX - size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX + size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY - size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY + size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = surfaceLayer.getChunk(chunkX, chunkY);
            chunk.riverSteppingStones.push(steppingStone);
         }
      }
   }

   // @Hack @Temporary
   createRiverSteppingStoneData(surfaceLayer.riverSteppingStones);
}

const readDebugData = (reader: PacketReader): EntityDebugData => {
   const entityID = reader.readNumber();

   const lines = new Array<LineDebugData>();
   const numLines = reader.readNumber();
   for (let i = 0; i < numLines; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const targetX = reader.readNumber();
      const targetY = reader.readNumber();
      const thickness = reader.readNumber();

      lines.push({
         colour: [r, g, b],
         targetPosition: [targetX, targetY],
         thickness: thickness
      });
   }

   const circles = new Array<CircleDebugData>();
   const numCircles = reader.readNumber();
   for (let i = 0; i < numCircles; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const radius = reader.readNumber();
      const thickness = reader.readNumber();

      circles.push({
         colour: [r, g, b],
         radius: radius,
         thickness: thickness
      });
   }

   const tileHighlights = new Array<TileHighlightData>();
   const numTileHighlights = reader.readNumber();
   for (let i = 0; i < numTileHighlights; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const x = reader.readNumber();
      const y = reader.readNumber();

      tileHighlights.push({
         colour: [r, g, b],
         tilePosition: [x, y]
      });
   }
   
   const entries = new Array<string>();
   const numDebugEntries = reader.readNumber();
   for (let i = 0; i < numDebugEntries; i++) {
      // @Hack: hardcoded
      const entry = reader.readString(1000);
      entries.push(entry);
   }

   let pathData: PathData | undefined;

   const pathNodes = new Array<PathfindingNodeIndex>();
   const numPathNodes = reader.readNumber();
   for (let i = 0; i < numPathNodes; i++) {
      const nodeIndex = reader.readNumber();
      pathNodes.push(nodeIndex);
   }

   const rawPathNodes = new Array<PathfindingNodeIndex>();
   const numRawPathNodes = reader.readNumber();
   for (let i = 0; i < numRawPathNodes; i++) {
      const nodeIndex = reader.readNumber();
      rawPathNodes.push(nodeIndex);
   }

   if (numPathNodes > 0 || numRawPathNodes > 0) {
      pathData = {
         pathNodes: pathNodes,
         rawPathNodes: rawPathNodes
      };
   }
   
   return {
      entityID: entityID,
      lines: lines,
      circles: circles,
      tileHighlights: tileHighlights,
      debugEntries: entries,
      pathData: pathData
   };
}

const processPlayerUpdateData = (reader: PacketReader): void => {
   if (Player.instance === null) {
      throw new Error();
   }
   
   // Skip entity type
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

   // @Copynpaste
   const layerIdx = reader.readNumber();
   const layer = layers[layerIdx];
   const previousLayer = getEntityLayer(Player.instance.id);
   if (layer !== previousLayer) {
      // Change layers
      changeEntityLayer(Player.instance.id, layer);
   }
      
   const numComponents = reader.readNumber();
   for (let i = 0; i < numComponents; i++) {
      const componentType = reader.readNumber() as ServerComponentType;

      const component = Player.instance.getServerComponent(componentType);
      if (typeof component.updatePlayerFromData !== "undefined") {
         component.updatePlayerFromData(reader);
      } else {
         component.padData(reader);
      }
   }

      // @Incomplete
      // const leftThrownBattleaxeItemID = entityData.clientArgs[14] as number;
      // player.leftThrownBattleaxeItemID = leftThrownBattleaxeItemID;
      // Hotbar_updateLeftThrownBattleaxeItemID(leftThrownBattleaxeItemID);
}

export function processEntityCreationData(entityID: EntityID, reader: PacketReader): void {
   const entityType = reader.readNumber() as EntityType;
   const layerIdx = reader.readNumber();

   const entity = createEntity(entityID, entityType);
   const isPlayer = entityID === Game.playerID;
   
   const numComponents = reader.readNumber();
   for (let i = 0; i < numComponents; i++) {
      const componentType = reader.readNumber() as ServerComponentType;
      
      const component = createComponent(entity, componentType);
      if (isPlayer) {
         component.updatePlayerFromData!(reader);
      } else {
         component.updateFromData(reader);
      }
      entity.addServerComponent(componentType, component);

      const componentArray = getServerComponentArray(componentType);
      componentArray.addComponent(entity.id, component);
   }

   const layer = layers[layerIdx];
   addEntity(entity, layer);

   // Set the player instance
   if (isPlayer) {
      Player.instance = entity as Player;
      Camera.setTrackedEntityID(entityID);
   }
}

const processEntityUpdateData = (entityID: EntityID, reader: PacketReader): void => {
   // Skip entity type
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

   const layerIdx = reader.readNumber();
   const layer = layers[layerIdx];
   const previousLayer = getEntityLayer(entityID);
   if (layer !== previousLayer) {
      // Change layers
      changeEntityLayer(entityID, layer);
   }
   
   const entity = getEntityByID(entityID)!;

   const numComponents = reader.readNumber();
   for (let i = 0; i < numComponents; i++) {
      const componentType = reader.readNumber() as ServerComponentType;
      
      const component = entity.getServerComponent(componentType);
      component.updateFromData(reader);
   }

   // @Speed: Does this mean we can just collect all updated entities each tick and not have to do the dirty array bullshit?
   // If you're updating the entity, then the server must have had some reason to send the data, so we should always consider the entity dirty.
   // @Incomplete: Are there some situations where this isn't the case?
   entity.dirty();
}

export function processGameDataPacket(reader: PacketReader): void {
   registerServerTick();
   
   const simulationIsPaused = reader.readBoolean();
   reader.padOffset(3);
   updateDebugScreenIsPaused(simulationIsPaused);

   const ticks = reader.readNumber();
   const time = reader.readNumber();

   const layerIdx = reader.readNumber();
   const playerLayer = layers[layerIdx];

   // @hack @Temporary
   const startLayer = Player.instance !== null ? getEntityLayer(Player.instance!.id) : layers[0];

   if (playerLayer !== startLayer) {
      playSound("layer-change.mp3", 0.55, 1, Camera.position.copy());
   }

   const playerIsAlive = reader.readBoolean();
   reader.padOffset(3);

   Board.serverTicks = ticks;
   updateDebugScreenTicks(ticks);
   Board.time = time;
   updateDebugScreenCurrentTime(time);

   // 
   // Player tribe data
   // 
   // @Cleanup: move into a separate function

   const tribeName = reader.readString(100);
   const tribeID = reader.readNumber();
   const tribeType = reader.readNumber();
   const hasTotem = reader.readBoolean();
   reader.padOffset(3);
   const numHuts = reader.readNumber();
   const tribesmanCap = reader.readNumber();

   const area = new Array<[tileX: number, tileY: number]>();
   const areaLength = reader.readNumber();
   for (let i = 0; i < areaLength; i++) {
      const tileX = reader.readNumber();
      const tileY = reader.readNumber();
      area.push([tileX, tileY]);
   }

   const rawSelectedTechID = reader.readNumber();
   const selectedTechID = rawSelectedTechID !== -1 ? rawSelectedTechID : null;

   const unlockedTechs = new Array<TechID>();
   const numUnlockedTechs = reader.readNumber();
   for (let i = 0; i < numUnlockedTechs; i++) {
      const techID = reader.readNumber();
      unlockedTechs.push(techID);
   }

   // Tech tree unlock progress
   const techTreeUnlockProgress: TechTreeUnlockProgress = {};
   const numTechProgressEntries = reader.readNumber();
   for (let i = 0; i < numTechProgressEntries; i++) {
      const techID = reader.readNumber() as TechID;

      const itemProgress: ItemRequirements = {};
      const numRequirements = reader.readNumber();
      for (let j = 0; j < numRequirements; j++) {
         const itemType = reader.readNumber() as ItemType;
         const amount = reader.readNumber();
         itemProgress[itemType] = amount;
      }

      const studyProgress = reader.readNumber();

      techTreeUnlockProgress[techID] = {
         itemProgress: itemProgress,
         studyProgress: studyProgress
      };
   }

   // @Temporary @Incomplete @Speed: garbage collection
   const tribeData: PlayerTribeData = {
      name: tribeName,
      id: tribeID,
      tribeType: tribeType,
      hasTotem: hasTotem,
      numHuts: numHuts,
      tribesmanCap: tribesmanCap,
      area: area,
      selectedTechID: selectedTechID,
      unlockedTechs: unlockedTechs,
      techTreeUnlockProgress: techTreeUnlockProgress
   };
   Client.updateTribe(tribeData);

   // Enemy tribes data
   // @Temporary
   const enemyTribesData = new Array<EnemyTribeData>();
   const numEnemyTribes = reader.readNumber();
   for (let i = 0; i < numEnemyTribes; i++) {
      const name = reader.readString(100);
      const id = reader.readNumber();
      const tribeType = reader.readNumber();

      enemyTribesData.push({
         name: name,
         id: id,
         tribeType: tribeType
      });
   }
   Game.enemyTribes = enemyTribesData;

   // Process entities
   const playerInstanceID = Game.playerID;
   const numEntities = reader.readNumber();
   const visibleEntities = [];
   for (let i = 0; i < numEntities; i++) {
      const entityID = reader.readNumber() as EntityID;
      visibleEntities.push(entityID);
      if (entityID === playerInstanceID) {
         if (Player.instance === null) {
            processEntityCreationData(entityID, reader);
         } else {
            processPlayerUpdateData(reader);
         }
      } else if (entityExists(entityID)) {
         processEntityUpdateData(entityID, reader);
      } else {
         processEntityCreationData(entityID, reader);
      }
   }

   const entitiesToRemove = new Set<Entity>();

   // @Hack @Speed: remove once carmack networking is in place
   const newPlayerLayer = getEntityLayer(Player.instance!.id);
   if (newPlayerLayer !== startLayer) {
      for (let i = 0; i < TransformComponentArray.entities.length; i++) {
         const entity = TransformComponentArray.entities[i];
         const layer = getEntityLayer(entity);
         if (layer !== newPlayerLayer) {
            entitiesToRemove.add(getEntityByID(entity)!);
         }
      }
   }
   
   // Read removed entity IDs
   const serverRemovedEntityIDs = new Set<number>();
   const numRemovedEntities = reader.readNumber();
   for (let i = 0; i < numRemovedEntities; i++) {
      const entityID = reader.readNumber();

      serverRemovedEntityIDs.add(entityID);
      
      const entity = getEntityByID(entityID);
      if (typeof entity !== "undefined") {
         entitiesToRemove.add(entity);
      }
   }

   // @Cleanup: move to own function
   
   // Remove entities which are no longer visible
   const minVisibleChunkX = Camera.minVisibleChunkX - 2;
   const maxVisibleChunkX = Camera.maxVisibleChunkX + 2;
   const minVisibleChunkY = Camera.minVisibleChunkY - 2;
   const maxVisibleChunkY = Camera.maxVisibleChunkY + 2;
   // @Speed
   for (let chunkX = 0; chunkX < Settings.BOARD_SIZE; chunkX++) {
      for (let chunkY = 0; chunkY < Settings.BOARD_SIZE; chunkY++) {
         // Skip visible chunks
         if (chunkX >= minVisibleChunkX && chunkX <= maxVisibleChunkX && chunkY >= minVisibleChunkY && chunkY <= maxVisibleChunkY) {
            continue;
         }

         const chunk = playerLayer.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entityID = chunk.entities[i];
            const entity = getEntityByID(entityID)!;
            entitiesToRemove.add(entity);
         }
      }
   }

   if (Player.instance !== null) {
      entitiesToRemove.delete(Player.instance);
   }

   for (const entity of entitiesToRemove) {
      const isDeath = serverRemovedEntityIDs.has(entity.id);
      removeEntity(entity, isDeath);
   }

   const visibleHits = new Array<HitData>();
   const numHits = reader.readNumber();
   for (let i = 0; i < numHits; i++) {
      const hitEntityID = reader.readNumber();
      const x = reader.readNumber();
      const y = reader.readNumber();
      const attackEffectiveness = reader.readNumber() as AttackEffectiveness;
      const damage = reader.readNumber();
      const shouldShowDamageNumber = reader.readBoolean();
      reader.padOffset(3);
      const flags = reader.readNumber();
      
      const hit: HitData = {
         hitEntityID: hitEntityID,
         hitPosition: [x, y],
         attackEffectiveness: attackEffectiveness,
         damage: damage,
         shouldShowDamageNumber: shouldShowDamageNumber,
         flags: flags
      };
      visibleHits.push(hit);
   }

   const playerKnockbacks = new Array<PlayerKnockbackData>();
   const numPlayerKnockbacks = reader.readNumber();
   for (let i = 0; i < numPlayerKnockbacks; i++) {
      const knockback = reader.readNumber();
      const knockbackDirection = reader.readNumber();
      playerKnockbacks.push({
         knockback: knockback,
         knockbackDirection: knockbackDirection
      });
   }

   const heals = new Array<HealData>();
   const numHeals = reader.readNumber();
   for (let i = 0; i < numHeals; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const healedID = reader.readNumber();
      const healerID = reader.readNumber();
      const healAmount = reader.readNumber();
      heals.push({
         entityPositionX: x,
         entityPositionY: y,
         healedID: healedID,
         healerID: healerID,
         healAmount: healAmount
      });
   }

   const visibleEntityDeathIDs = new Array<EntityID>();
   const numVisibleDeaths = reader.readNumber();
   for (let i = 0; i < numVisibleDeaths; i++) {
      const id = reader.readNumber();
      visibleEntityDeathIDs.push(id);
   }

   const orbCompletes = new Array<ResearchOrbCompleteData>();
   const numOrbs = reader.readNumber();
   for (let i = 0; i < numOrbs; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const amount = reader.readNumber();

      orbCompletes.push({
         x: x,
         y: y,
         amount: amount
      });
   }

   const tileUpdates = new Array<ServerTileUpdateData>();
   const numTileUpdates = reader.readNumber();
   for (let i = 0; i < numTileUpdates; i++) {
      const layerIdx = reader.readNumber();
      const tileIndex = reader.readNumber();
      const tileType = reader.readNumber();
      const isWall = reader.readBoolean();
      reader.padOffset(3);

      tileUpdates.push({
         layerIdx: layerIdx,
         tileIndex: tileIndex,
         type: tileType,
         isWall: isWall
      });
   }

   const playerHealth = reader.readNumber();

   // We call the kill function here as the if the player is dead then they won't be in the update array.
   if (playerHealth === 0 && Player.instance !== null) {
      Client.killPlayer();
   }

   const hasDebugData = reader.readBoolean();
   reader.padOffset(3);
   
   let debugData: EntityDebugData | undefined;
   if (hasDebugData) {
      debugData = readDebugData(reader);
   }

   // @Incomplete
   // hasFrostShield: player.immunityTimer === 0 && playerArmour !== null && playerArmour.type === ItemType.deepfrost_armour,

   const hasFrostShield = reader.readBoolean();
   reader.padOffset(3);

   const hasPickedUpItem = reader.readBoolean();
   reader.padOffset(3);

   let hotbarCrossbowLoadProgressRecord: Partial<Record<number, number>> | undefined;
   if (playerIsAlive) {
      hotbarCrossbowLoadProgressRecord = readCrossbowLoadProgressRecord(reader);
   }

   // Title offer
   const hasTitleOffer = reader.readBoolean();
   reader.padOffset(3);
   let titleOffer: TribesmanTitle | null = null;
   if (hasTitleOffer) {
      titleOffer = reader.readNumber();
   }
   
   // Tick events
   const tickEvents = new Array<EntityTickEvent>();
   const numTickEvents = reader.readNumber();
   for (let i = 0; i < numTickEvents; i++) {
      const entityID = reader.readNumber()
      const type = reader.readNumber() as EntityTickEventType;
      const data = reader.readNumber();
      tickEvents.push({
         entityID: entityID,
         type: type,
         data: data
      });
   }
   
   const gameDataPacket: GameDataPacket = {
      tileUpdates: tileUpdates,
      visibleHits: visibleHits,
      playerKnockbacks: playerKnockbacks,
      heals: heals,
      orbCompletes: orbCompletes,
      playerHealth: playerHealth,
      entityDebugData: debugData,
      playerTribeData: {
         name: tribeName,
         id: tribeID,
         tribeType: tribeType,
         hasTotem: hasTotem,
         numHuts: numHuts,
         tribesmanCap: tribesmanCap,
         area: area,
         selectedTechID: selectedTechID,
         unlockedTechs: unlockedTechs,
         techTreeUnlockProgress: techTreeUnlockProgress
      },
      enemyTribesData: enemyTribesData,
      hasFrostShield: hasFrostShield,
      pickedUpItem: hasPickedUpItem,
      hotbarCrossbowLoadProgressRecord: hotbarCrossbowLoadProgressRecord,
      titleOffer: titleOffer,
      tickEvents: tickEvents,
      // @Incomplete
      visiblePathfindingNodeOccupances: [],
      visibleSafetyNodes: [],
      visibleBuildingPlans: [],
      visibleBuildingSafetys: [],
      visibleRestrictedBuildingAreas: [],
      visibleWalls: [],
      visibleWallConnections: [],
      visibleEntityDeathIDs: [],
      visibleGrassBlockers: []
   };

   // @Cleanup: remove
   Client.processGameDataPacket(gameDataPacket);
}

export function processSyncDataPacket(reader: PacketReader): void {
   if (!Game.isRunning || Player.instance === null) return;
   
   const x = reader.readNumber();
   const y = reader.readNumber();
   const rotation = reader.readNumber();

   const selfVelocityX = reader.readNumber();
   const selfVelocityY = reader.readNumber();
   const externalVelocityX = reader.readNumber();
   const externalVelocityY = reader.readNumber();
   const accelerationX = reader.readNumber();
   const accelerationY = reader.readNumber();

   const transformComponent = Player.instance.getServerComponent(ServerComponentType.transform);
   
   transformComponent.position.x = x;
   transformComponent.position.y = y;
   transformComponent.rotation = rotation;

   const physicsComponent = Player.instance.getServerComponent(ServerComponentType.physics);
   physicsComponent.selfVelocity.x = selfVelocityX;
   physicsComponent.selfVelocity.y = selfVelocityY;
   physicsComponent.externalVelocity.x = externalVelocityX;
   physicsComponent.externalVelocity.y = externalVelocityY;
   physicsComponent.acceleration.x = accelerationX;
   physicsComponent.acceleration.y = accelerationY;
   
   Game.sync();
}

export function processRespawnDataPacket(reader: PacketReader): void {
   // Create the player
   const playerID = reader.readNumber();
   // @Hack
   Game.playerID = playerID;
   processEntityCreationData(playerID, reader);
   
   selectItemSlot(1);
   
   const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;
   updateHealthBar(maxHealth);

   gameScreenSetIsDead(false);

   // Clear any queued packets, as they contain data from when the player wasn't respawned.
   const queuedPackets = getQueuedGameDataPackets();
   queuedPackets.length = 0;
}