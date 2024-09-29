import { EntityInfo } from "../../shared/src/board-interface";
import { GrassTileInfo, RiverFlowDirectionsRecord, RiverSteppingStoneData, WaterRockData } from "../../shared/src/client-server-types";
import { ServerComponentType } from "../../shared/src/components";
import { EntityID } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { WorldInfo } from "../../shared/src/structures";
import { TileIndex } from "../../shared/src/utils";
import Chunk from "./Chunk";
import { Tile } from "./Tile";
import { getEntityByID } from "./world";

export function getTileIndexIncludingEdges(tileX: number, tileY: number): TileIndex {
   return (tileY + Settings.EDGE_GENERATION_DISTANCE) * (Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2) + tileX + Settings.EDGE_GENERATION_DISTANCE;
}

export function tileIsWithinEdge(tileX: number, tileY: number): boolean {
   return tileX >= -Settings.EDGE_GENERATION_DISTANCE && tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY >= -Settings.EDGE_GENERATION_DISTANCE && tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE;
}

export function tileIsInWorld(tileX: number, tileY: number): boolean {
   return tileX >= 0 && tileX < Settings.BOARD_DIMENSIONS && tileY >= 0 && tileY < Settings.BOARD_DIMENSIONS;
}

export default class Layer {
   public readonly tiles: ReadonlyArray<Tile>;
   public readonly riverFlowDirections: RiverFlowDirectionsRecord;
   public readonly waterRocks: Array<WaterRockData>;
   public readonly riverSteppingStones: Array<RiverSteppingStoneData>;
   public readonly grassInfo: Record<number, Record<number, GrassTileInfo>>;

   public readonly chunks: ReadonlyArray<Chunk>;

   constructor(tiles: ReadonlyArray<Tile>, riverFlowDirections: RiverFlowDirectionsRecord, waterRocks: Array<WaterRockData>, riverSteppingStones: Array<RiverSteppingStoneData>, grassInfo: Record<number, Record<number, GrassTileInfo>>) {
      this.tiles = tiles;
      this.riverFlowDirections = riverFlowDirections;
      this.waterRocks = waterRocks;
      this.riverSteppingStones = riverSteppingStones;
      this.grassInfo = grassInfo;

      // Create the chunk array
      const chunks = new Array<Chunk>();
      for (let x = 0; x < Settings.BOARD_SIZE; x++) {
         for (let y = 0; y < Settings.BOARD_SIZE; y++) {
            const chunk = new Chunk(x, y);
            chunks.push(chunk);
         }
      }
      this.chunks = chunks;
   }

   public getTile(tileIndex: TileIndex): Tile {
      return this.tiles[tileIndex];
   }

   public getTileFromCoords(tileX: number, tileY: number): Tile {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return this.tiles[tileIndex];
   }

   public tileIsWallFromCoords(tileX: number, tileY: number): boolean {
      if (!tileIsInWorld(tileX, tileY)) {
         return false;
      }

      const tile = this.getTileFromCoords(tileX, tileY);
      return tile.isWall;
   }

   public getChunk(chunkX: number, chunkY: number): Chunk {
      const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
      return this.chunks[chunkIndex];
   }

   public getRiverFlowDirection(tileX: number, tileY: number): number {
      const rowDirections = this.riverFlowDirections[tileX];
      if (typeof rowDirections === "undefined") {
         throw new Error("Tried to get the river flow direction of a non-water tile.");
      }

      const direction = rowDirections[tileY];
      if (typeof direction === "undefined") {
         throw new Error("Tried to get the river flow direction of a non-water tile.");
      }
      
      return direction;
   }

   public getWorldInfo(): WorldInfo {
      return {
         chunks: this.chunks,
         getEntityCallback: (entityID: EntityID): EntityInfo => {
            const entity = getEntityByID(entityID)!;
            const transformComponent = entity.getServerComponent(ServerComponentType.transform);

            return {
               type: entity.type,
               position: transformComponent.position,
               rotation: transformComponent.rotation,
               id: entityID,
               hitboxes: transformComponent.hitboxes
            };
         }
      }
   }
}