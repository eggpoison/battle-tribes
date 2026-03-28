import { TileIndex, Biome, TileType, Settings, PacketReader, WaterRockData, GrassTileInfo, RiverFlowDirectionsRecord, WaterRockSize, InventoryName, AttackVars, getTileX, getTileY, getTileIndexIncludingEdges, tileIsInWorldIncludingEdges, tileIsInWorld } from "webgl-test-shared";
import { refreshCameraView, setCameraPosition } from "../camera";
import { Tile } from "../Tile";
import { addLayer, layers, setCurrentLayer, surfaceLayer } from "../world";
import { NEIGHBOUR_OFFSETS } from "../utils";
import Layer from "../Layer";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { initialiseRenderables } from "../rendering/render-loop";
import { playerInstance } from "../player";
import { registerTamingSpecsFromData } from "../taming-specs";
import { addChatMessage } from "../chat";
import { gameUIState } from "../../ui-state/game-ui-state";
import { getSelectedItemInfo } from "../player-action-handling";
import { playerActionState } from "../../ui-state/player-action-state";
import { gameIsRunning, resyncGame } from "../game";
import { registerEntityComponentTypesFromData } from "../entity-component-types";

const getBuildingBlockingTiles = (): ReadonlySet<TileIndex> => {
   // Initially find all tiles below a dropdown tile
   const buildingBlockingTiles = new Set<TileIndex>();
   for (let tileX = 0; tileX < Settings.WORLD_SIZE_TILES; tileX++) {
      for (let tileY = 0; tileY < Settings.WORLD_SIZE_TILES; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const surfaceTile = surfaceLayer.getTile(tileIndex);
         if (surfaceTile.type === TileType.dropdown) {
            buildingBlockingTiles.add(tileIndex);
         }
      }
   }

   // Expand the tiles to their neighbours
   for (let i = 0; i < 3; i++) {
      const tilesToExpand = Array.from(buildingBlockingTiles);

      for (const tileIndex of tilesToExpand) {
         const tileX = getTileX(tileIndex);
         const tileY = getTileY(tileIndex);
         
         if (tileIsInWorld(tileX + 1, tileY)) {
            buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX + 1, tileY));
         }
         if (tileIsInWorld(tileX, tileY + 1)) {
            buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX, tileY + 1));
         }
         if (tileIsInWorld(tileX - 1, tileY)) {
            buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX - 1, tileY));
         }
         if (tileIsInWorld(tileX, tileY - 1)) {
            buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX, tileY - 1));
         }
      }
   }

   return buildingBlockingTiles;
}

export function processInitialGameDataPacket(reader: PacketReader): void {
   const layerIdx = reader.readNumber();
   
   const spawnPosition = reader.readPoint();
   
   // Create layers
   const numLayers = reader.readNumber();
   for (let i = 0; i < numLayers; i++) {
      const tiles = new Array<Tile>();
      const flowDirections: RiverFlowDirectionsRecord = {};
      const grassInfoRecord: Record<number, Record<number, GrassTileInfo>> = {};
      for (let tileIndex = 0; tileIndex < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES; tileIndex++) {
         const tileType = reader.readNumber() as TileType;
         const tileBiome = reader.readNumber() as Biome;
         const flowDirection = reader.readNumber();
         const temperature = reader.readNumber();
         const humidity = reader.readNumber();
         const mithrilRichness = reader.readNumber();
   
         const tileX = getTileX(tileIndex);
         const tileY = getTileY(tileIndex);

         const tile = new Tile(tileX, tileY, tileType, tileBiome, mithrilRichness);
         tiles.push(tile);
   
         if (flowDirections[tileX] === undefined) {
            flowDirections[tileX] = {};
         }
         flowDirections[tileX]![tileY] = flowDirection;
   
         const grassInfo: GrassTileInfo = {
            tileX: tileX,
            tileY: tileY,
            temperature: temperature,
            humidity: humidity
         };
         if (grassInfoRecord[tileX] === undefined) {
            grassInfoRecord[tileX] = {};
         }
         grassInfoRecord[tileX]![tileY] = grassInfo;
      }

      // Read in subtiles
      const wallSubtileTypes = new Float32Array(Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES * 16);
      for (let i = 0; i < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES * 16; i++) {
         const subtileType = reader.readNumber();
         wallSubtileTypes[i] = subtileType;
      }

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

      const buildingBlockingTiles: ReadonlySet<TileIndex> = i > 0 ? getBuildingBlockingTiles() : new Set();
      const layer = new Layer(i, tiles, buildingBlockingTiles, wallSubtileTypes, wallSubtileDamageTakenMap, flowDirections, [], grassInfoRecord);
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

   registerTamingSpecsFromData(reader);

   registerEntityComponentTypesFromData(reader);
}


export function processSyncGameDataPacket(reader: PacketReader): void {
   if (!gameIsRunning) return;
   
   const position = reader.readPoint();
   const angle = reader.readNumber();
   const previousPosition = reader.readPoint();
   const acceleration = reader.readPoint();

   if (playerInstance !== null) {
      const transformComponent = TransformComponentArray.getComponent(playerInstance);
      const playerHitbox = transformComponent.hitboxes[0];
   
      playerHitbox.box.position.set(position);
      playerHitbox.box.angle = angle;
      playerHitbox.previousPosition.set(previousPosition);
      playerHitbox.acceleration.set(acceleration);
   }

   // @Squeam
   // receiveInitialPacket(reader);
   
   resyncGame();
}

export function processForcePositionUpdatePacket(reader: PacketReader): void {
   if (playerInstance === null) {
      return;
   }
   
   const x = reader.readNumber();
   const y = reader.readNumber();

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   const playerHitbox = transformComponent.hitboxes[0];
   playerHitbox.box.position.x = x;
   playerHitbox.box.position.y = y;
}

export function receiveChatMessagePacket(reader: PacketReader): void {
   const username = reader.readString();
   const message = reader.readString();
   addChatMessage(username, message);
}
   
export function processSimulationStatusUpdatePacket(reader: PacketReader): void {
   const isSimulating = reader.readBool();
   gameUIState.setIsSimulating(isSimulating);
}

export function processShieldKnockPacket(): void {
   const selectedItemInfo = getSelectedItemInfo();
   if (selectedItemInfo === null) {
      return;
   }
   
   if (selectedItemInfo.inventoryName === InventoryName.hotbar) {
      playerActionState.setHotbarItemRestTime({
         remainingTimeTicks: AttackVars.SHIELD_BLOCK_REST_TIME_TICKS,
         durationTicks: AttackVars.SHIELD_BLOCK_REST_TIME_TICKS,
         itemSlot: selectedItemInfo.itemSlot
      });
   } else {
      playerActionState.setOffhandItemRestTime({
         remainingTimeTicks: AttackVars.SHIELD_BLOCK_REST_TIME_TICKS,
         durationTicks: AttackVars.SHIELD_BLOCK_REST_TIME_TICKS,
         itemSlot: selectedItemInfo.itemSlot
      });
   }
}