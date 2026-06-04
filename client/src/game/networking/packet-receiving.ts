import { PacketReader } from "../../../../shared/src/packets";
import { RiverFlowDirectionsRecord, WaterRockData, WaterRockSize } from "../../../../shared/src/client-server-types";
import { Settings } from "../../../../shared/src/settings";
import { TileType } from "../../../../shared/src/tiles";
import { Biome } from "../../../../shared/src/biomes";
import { getTileIndexIncludingEdges, tileIsInWorldIncludingEdges } from "../../../../shared/src/utils";
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
import { readInitialSubtileData, RenderChunkVars, RenderChunkEdgeInfo, EdgeInfoArrays, EdgeType, addTileToEdgeInfos } from "../rendering/render-chunks";

export interface IntermediateInitialisationInfo {
   readonly shadowInfoArrays: EdgeInfoArrays;
}

const NEIGHBOUR_OFFSETS = [
   [1, 0],
   [-1, 0],
   [0, -1],
   [-1, -1],
   [1, 1],
   [-1, 1],
   [0, 1],
   [1, -1]
];

// @CLEANUP would love to have this not return an intermediate thing :(
export function processInitialGameDataPacket(reader: PacketReader): IntermediateInitialisationInfo {
   const layerIdx = reader.readNumber();
   
   const spawnPosition = reader.readPoint();

   const shadowInfoArrays: EdgeInfoArrays = [];
   
   // Create layers
   const numLayers = reader.readNumber();
   for (let i = 0; i < numLayers; i++) {
      const floorEdgeInfos: Array<RenderChunkEdgeInfo> = [];
      const wallEdgeInfos: Array<RenderChunkEdgeInfo> = [];
      const dropdownEdgeInfos: Array<RenderChunkEdgeInfo> = [];
      for (let i = 0; i < RenderChunkVars.FULL_WORLD_RENDER_CHUNK_SIZE * RenderChunkVars.FULL_WORLD_RENDER_CHUNK_SIZE; i++) {
         floorEdgeInfos.push({
            indexes: [],
            markers: []
         });
         wallEdgeInfos.push({
            indexes: [],
            markers: []
         });
         dropdownEdgeInfos.push({
            indexes: [],
            markers: []
         });
      }
      shadowInfoArrays.push({
         [EdgeType.floor]: floorEdgeInfos,
         [EdgeType.wall]: wallEdgeInfos,
         [EdgeType.dropdown]: dropdownEdgeInfos
      });

      const tiles: Array<Tile> = [];
      const flowDirections: RiverFlowDirectionsRecord = {};
      const tileTemperatures = new Float32Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);
      const tileHumidities = new Float32Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES);
      for (let tileIndex = 0; tileIndex < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES; tileIndex++) {
         const tileType: TileType = reader.readNumber();
         const tileBiome: Biome = reader.readNumber();
         const flowDirection = reader.readNumber();
         const temperature = reader.readNumber();
         const humidity = reader.readNumber();
         const mithrilRichness = reader.readNumber();

         const tile = new Tile(tileType, tileBiome, mithrilRichness);
         tiles.push(tile);

         addTileToEdgeInfos(tiles, dropdownEdgeInfos, tileIndex, tileType);
   
         if (flowDirections[tileIndex] === undefined) {
            flowDirections[tileIndex] = flowDirection;
         }
   
         tileTemperatures[tileIndex] = temperature;
         tileHumidities[tileIndex] = humidity;
      }

      // Read in subtiles
      const wallSubtileTypes = new Uint8Array(Settings.FULL_WORLD_SIZE_SUBTILES * Settings.FULL_WORLD_SIZE_SUBTILES);
      readInitialSubtileData(reader, wallSubtileTypes, floorEdgeInfos, wallEdgeInfos);

      // Read subtile damages taken
      const numEntries = reader.readNumber();
      const wallSubtileDamageTakenMap = new Map<number, number>();
      for (let i = 0; i < numEntries; i++) {
         const subtileIndex = reader.readNumber();
         const damageTaken = reader.readNumber();

         wallSubtileDamageTakenMap.set(subtileIndex, damageTaken);
      }

      // Flag all tiles which border water
      for (let i = 0; i < tiles.length; i++) {
         const tile = tiles[i];
         if (tile.type === TileType.water) {
            const tileX = i % (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE * 2) - Settings.EDGE_GENERATION_DISTANCE;
            const tileY = Math.floor(i / (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE * 2)) - Settings.EDGE_GENERATION_DISTANCE;

            for (let j = 0; j < NEIGHBOUR_OFFSETS.length; j++) {
               const neighbourTileX = tileX + NEIGHBOUR_OFFSETS[j][0];
               const neighbourTileY = tileY + NEIGHBOUR_OFFSETS[j][1];

               if (tileIsInWorldIncludingEdges(neighbourTileX, neighbourTileY)) {
                  const tileIndex = getTileIndexIncludingEdges(neighbourTileX, neighbourTileY);
                  const neighbourTile = tiles[tileIndex];
                  neighbourTile.bordersWater = true;
               }
            }
         }
      }

      const layer = new Layer(i, tiles, wallSubtileTypes, wallSubtileDamageTakenMap, flowDirections, [], tileTemperatures, tileHumidities);
      addLayer(layer);
   }

   const spawnLayer = layers[layerIdx];
   setCurrentLayer(spawnLayer);

   // Relies on the number of layers
   initialiseRenderables();

   // Set the initial camera position
   setCameraPosition(spawnPosition);
   refreshCameraView();

   // @Hack: how do we know that 
   const surfaceLayer = layers[0];

   const numWaterRocks = reader.readNumber();
   for (let i = 0; i < numWaterRocks; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const rotation = reader.readNumber();
      const size: WaterRockSize = reader.readNumber();
      const opacity = reader.readNumber();

      const waterRock: WaterRockData = {
         position: [x, y],
         rotation: rotation,
         size: size,
         opacity: opacity
      };
      surfaceLayer.waterRocks.push(waterRock);
   }

   registerTamingSpecsFromData(reader);

   registerEntityComponentTypesFromData(reader);

   return {
      shadowInfoArrays: shadowInfoArrays
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