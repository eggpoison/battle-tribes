import { PacketReader } from "../../../../shared/src/packets";
import { RiverFlowDirectionsRecord, WaterRockData, WaterRockSize } from "../../../../shared/src/client-server-types";
import { Settings } from "../../../../shared/src/settings";
import { getTileIndexIncludingEdges, TileIndex, TileType } from "../../../../shared/src/tiles";
import { Biome } from "../../../../shared/src/biomes";
import { InventoryName } from "../../../../shared/src/items/items";
import { AttackVar } from "../../../../shared/src/attack-patterns";
import { refreshCameraView, setCameraPosition } from "../camera";
import { Tile } from "../Tile";
import { addLayer, layers, setCurrentLayer } from "../world";
import Layer from "../Layer";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { initialiseRenderables } from "../rendering/render-loop";
import { playerInstance } from "../player";
import { registerTamingSpecsFromData } from "../taming-specs";
import { gameUIState } from "../../ui-state/game-ui-state";
import { getSelectedItemInfo } from "../player-action-handling";
import { playerActionState } from "../../ui-state/player-action-state";
import { registerEntityComponentTypesFromData } from "../entity-components/component-types";
import { addMessageToChat } from "../../ui/game/Chat";
import { RenderChunkEdgeInfo, EdgeType, addTileToEdgeInfos, addSubtileToEdgeInfosPartial } from "../rendering/render-chunks";
import { getSubtileIndex, SubtileIndex } from "../../../../shared/src/subtiles";
import { assert } from "../../../../shared/src/utils";

export interface IntermediateInitialisationInfo {
   readonly minRenderChunkX: number;
   readonly maxRenderChunkX: number;
   readonly minRenderChunkY: number;
   readonly maxRenderChunkY: number;
   readonly surfaceWaterRockRenderChunks: Map<number, WaterRockData[]>;
}

// @cleanup: parameters :'(
export function addTileToWorld(tileType: TileType, tileBiome: Biome, flowDirection: number, temperature: number, humidity: number, mithrilRichness: number, tileIndex: number, tiles: Map<TileIndex, Tile>, dropdownEdgeInfos: Map<number, RenderChunkEdgeInfo>, flowDirections: RiverFlowDirectionsRecord, tileTemperatures: Map<TileIndex, number>, tileHumidities: Map<TileIndex, number>, dropdownTiles: TileIndex[]): void {
   const tile = new Tile(tileType, tileBiome, mithrilRichness);
   tiles.set(tileIndex, tile);

   addTileToEdgeInfos(tiles, dropdownEdgeInfos, tileIndex, tileType);

   if (flowDirections[tileIndex] === undefined) {
      flowDirections[tileIndex] = flowDirection;
   }

   tileTemperatures.set(tileIndex, temperature);
   tileHumidities.set(tileIndex, humidity);

   // Find dropdown tiles
   if (tile.type === TileType.dropdown) {
      dropdownTiles.push(tileIndex);
   }
}
export function removeTileFromWorld(layer: Layer, tileIndex: number): void {
   const tileType = layer.getTile(tileIndex).type;
   
   layer.tiles.delete(tileIndex);
   delete layer.riverFlowDirections[tileIndex];
   layer.tileTemperatures.delete(tileIndex);
   layer.tileHumidities.delete(tileIndex);
   
   if (tileType === TileType.dropdown) {
      const idx = layer.dropdownTiles.indexOf(tileIndex);
      assert(idx !== -1);
      layer.dropdownTiles.splice(idx, 1);
   }
}

export function readWaterRocksArray(reader: PacketReader): WaterRockData[] {
   const waterRocks: WaterRockData[] = [];
   const numWaterRocks = reader.readNumber();
   for (let i = 0; i < numWaterRocks; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const rotation = reader.readNumber();
      const size: WaterRockSize = reader.readNumber();
      const opacity = reader.readNumber();

      waterRocks.push({
         position: [x, y],
         rotation: rotation,
         size: size,
         opacity: opacity
      });
   }
   return waterRocks;
}

// @CLEANUP would love to have this not return an intermediate thing :(
export function processInitialGameDataPacket(reader: PacketReader): IntermediateInitialisationInfo {
   const layerIdx = reader.readNumber();
   const numLayers = reader.readNumber();
   
   const spawnPosition = reader.readPoint();

   // 
   // Terrain data
   // 

   const minRenderChunkX = reader.readNumber();
   const maxRenderChunkX = reader.readNumber();
   const minRenderChunkY = reader.readNumber();
   const maxRenderChunkY = reader.readNumber();

   const minTileX = minRenderChunkX * 2 * Settings.CHUNK_SIZE;
   const maxTileX = (maxRenderChunkX + 1) * 2 * Settings.CHUNK_SIZE - 1;
   const minTileY = minRenderChunkY * 2 * Settings.CHUNK_SIZE;
   const maxTileY = (maxRenderChunkY + 1) * 2 * Settings.CHUNK_SIZE - 1;
   const minSubtileX = minTileX * 4;
   const maxSubtileX = (maxTileX + 1) * 4 - 1;
   const minSubtileY = minTileY * 4;
   const maxSubtileY = (maxTileY + 1) * 4 - 1;

   for (let i = 0; i < numLayers; i++) {
      const floorEdgeInfos = new Map<number, RenderChunkEdgeInfo>();
      const wallEdgeInfos = new Map<number, RenderChunkEdgeInfo>();
      const dropdownEdgeInfos = new Map<number, RenderChunkEdgeInfo>();
      const edgeInfoMaps: Record<EdgeType, Map<number, RenderChunkEdgeInfo>> = {
         [EdgeType.floor]: floorEdgeInfos,
         [EdgeType.wall]: wallEdgeInfos,
         [EdgeType.dropdown]: dropdownEdgeInfos
      };

      const tiles = new Map<TileIndex, Tile>();
      const flowDirections: RiverFlowDirectionsRecord = {};
      const tileTemperatures = new Map<TileIndex, number>();
      const tileHumidities = new Map<TileIndex, number>();
      const dropdownTiles: TileIndex[] = [];
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
            const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

            const tileType: TileType = reader.readNumber();
            const tileBiome: Biome = reader.readNumber();
            const flowDirection = reader.readNumber();
            const temperature = reader.readNumber();
            const humidity = reader.readNumber();
            const mithrilRichness = reader.readNumber();
            
            addTileToWorld(tileType, tileBiome, flowDirection, temperature, humidity, mithrilRichness, tileIndex, tiles, dropdownEdgeInfos, flowDirections, tileTemperatures, tileHumidities, dropdownTiles);
         }
      }

      // Read in subtiles
      const wallSubtileDatas = new Map<SubtileIndex, number>();
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            const data = reader.readNumber();

            wallSubtileDatas.set(subtileIndex, data);
            addSubtileToEdgeInfosPartial(wallSubtileDatas, floorEdgeInfos, wallEdgeInfos, subtileIndex, data);
         }
      }

      const layer = new Layer(i, tiles, wallSubtileDatas, flowDirections, tileTemperatures, tileHumidities, dropdownTiles, edgeInfoMaps);
      addLayer(layer);
   }

   const spawnLayer = layers[layerIdx];
   setCurrentLayer(spawnLayer);

   // Relies on the number of layers
   initialiseRenderables();

   // Set the initial camera position
   // @CLEANUP @Incomplete: Why is this necessary?
   setCameraPosition(spawnPosition);
   refreshCameraView();

   const surfaceWaterRockRenderChunks = new Map<number, WaterRockData[]>();
   const numRenderChunksWithWaterRocks = reader.readNumber();
   for (let i = 0; i < numRenderChunksWithWaterRocks; i++) {
      const renderChunkIndex = reader.readNumber();

      const waterRocks = readWaterRocksArray(reader);
      surfaceWaterRockRenderChunks.set(renderChunkIndex, waterRocks);
   }

   registerTamingSpecsFromData(reader);

   registerEntityComponentTypesFromData(reader);

   return {
      minRenderChunkX: minRenderChunkX,
      maxRenderChunkX: maxRenderChunkX,
      minRenderChunkY: minRenderChunkY,
      maxRenderChunkY: maxRenderChunkY,
      surfaceWaterRockRenderChunks
   };
}


export function onSyncGameDataPacket(reader: PacketReader): void {
   const position = reader.readPoint();
   const angle = reader.readNumber();
   const previousPosition = reader.readPoint();
   const acceleration = reader.readPoint();

   if (playerInstance !== null) {
      const transformComponent = TransformComponentArray.getComponent(playerInstance);
      const playerHitbox = transformComponent.hitboxes[0];
   
      playerHitbox.box.posX = position.x;
      playerHitbox.box.posY = position.y;
      playerHitbox.box.angle = angle;
      playerHitbox.previousPosX = previousPosition.x;
      playerHitbox.previousPosY = previousPosition.y;
      playerHitbox.accelX = acceleration.x;
      playerHitbox.accelY = acceleration.y;
   }
}

export function onForcePositionUpdatePacket(reader: PacketReader): void {
   if (playerInstance === null) {
      return;
   }
   
   const x = reader.readNumber();
   const y = reader.readNumber();

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   const playerHitbox = transformComponent.hitboxes[0];
   playerHitbox.box.posX = x;
   playerHitbox.box.posY = y;
}

export function onChatMessagePacket(reader: PacketReader): void {
   const username = reader.readString();
   const message = reader.readString();
   addMessageToChat(username, message);
}
   
export function onSimulationStatusUpdatePacket(reader: PacketReader): void {
   const isSimulating = reader.readBool();
   gameUIState.setIsSimulating(isSimulating);
}

export function onShieldKnockPacket(): void {
   const selectedItemInfo = getSelectedItemInfo();
   if (selectedItemInfo === null) {
      return;
   }
   
   if (selectedItemInfo.inventoryName === InventoryName.hotbar) {
      playerActionState.setHotbarItemRestTime({
         remainingTimeTicks: AttackVar.SHIELD_BLOCK_REST_TIME_TICKS,
         durationTicks: AttackVar.SHIELD_BLOCK_REST_TIME_TICKS,
         itemSlot: selectedItemInfo.itemSlot
      });
   } else {
      playerActionState.setOffhandItemRestTime({
         remainingTimeTicks: AttackVar.SHIELD_BLOCK_REST_TIME_TICKS,
         durationTicks: AttackVar.SHIELD_BLOCK_REST_TIME_TICKS,
         itemSlot: selectedItemInfo.itemSlot
      });
   }
}