import { EntityType } from "../../../shared/src/entities";
import { PacketReader } from "../../../shared/src/packets";
import { assert, TileIndex } from "../../../shared/src/utils";
import { currentSnapshot } from "./client";

interface LocalEntityCensusInfo {
   count: number;
   density: number;
   readonly maxDensity: number;
}

interface LocalBiome {
   readonly tiles: Array<TileIndex>;
   readonly entityCensus: Map<EntityType, LocalEntityCensusInfo>;
   lastUpdateTicks: number;
}

const visibleLocalBiomes = new Map<number, LocalBiome>();

const readLocalBiome = (reader: PacketReader): LocalBiome => {
   const tiles = new Array<TileIndex>();
   const numTiles = reader.readNumber();
   for (let i = 0; i < numTiles; i++) {
      const tileIndex = reader.readNumber();
      tiles.push(tileIndex);
   }

   const entityCensus = new Map<EntityType, LocalEntityCensusInfo>();
   const numCensusEntries = reader.readNumber();
   for (let i = 0; i < numCensusEntries; i++) {
      const entityType = reader.readNumber() as EntityType;
      const count = reader.readNumber();
      const density = reader.readNumber();
      const maxDensity = reader.readNumber();
      entityCensus.set(entityType, {
         count: count,
         density: density,
         maxDensity: maxDensity
      });
   }

   return {
      tiles: tiles,
      entityCensus: entityCensus,
      lastUpdateTicks: currentSnapshot.tick
   };
}

const updateLocalBiomeFromData = (reader: PacketReader, localBiome: LocalBiome): void => {
   localBiome.tiles.splice(0, localBiome.tiles.length);

   // @Hack
   const numTiles = reader.readNumber();
   for (let i = 0; i < numTiles; i++) {
      const tileIndex = reader.readNumber() as TileIndex;
      localBiome.tiles.push(tileIndex);
   }

   for (const pair of localBiome.entityCensus) {
      const entityCensusInfo = pair[1];
      entityCensusInfo.count = 0;
   }

   const numCensusEntries = reader.readNumber();
   for (let i = 0; i < numCensusEntries; i++) {
      const entityType = reader.readNumber() as EntityType;
      const count = reader.readNumber();
      const density = reader.readNumber();
      const maxDensity = reader.readNumber();

      // @Garbage
      localBiome.entityCensus.set(entityType, {
         count: count,
         density: density,
         maxDensity: maxDensity
      });
   }

   for (const pair of localBiome.entityCensus) {
      const entityCensusInfo = pair[1];
      if (entityCensusInfo.count === 0) {
         const entityType = pair[0];
         localBiome.entityCensus.delete(entityType);
      }
   }

   localBiome.lastUpdateTicks = currentSnapshot.tick;
}

export function updateLocalBiomesFromData(reader: PacketReader): void {
   const numLocalBiomes = reader.readNumber();
   assert(Number.isInteger(numLocalBiomes));
   for (let i = 0; i < numLocalBiomes; i++) {
      const localBiomeID = reader.readNumber();

      const existingLocalBiome = visibleLocalBiomes.get(localBiomeID);
      if (typeof existingLocalBiome !== "undefined") {
         updateLocalBiomeFromData(reader, existingLocalBiome);
      } else {
         const localBiome = readLocalBiome(reader);
         visibleLocalBiomes.set(localBiomeID, localBiome);
      }
   }

   for (const pair of visibleLocalBiomes) {
      const localBiome = pair[1];
      if (localBiome.lastUpdateTicks !== currentSnapshot.tick) {
         const id = pair[0];
         visibleLocalBiomes.delete(id);
      }
   }
}

export function getTileLocalBiome(tileIndex: TileIndex): LocalBiome | null {
   for (const pair of visibleLocalBiomes) {
      const localBiome = pair[1];
      for (const currentTileIndex of localBiome.tiles) {
         if (currentTileIndex === tileIndex) {
            return localBiome;
         }
      }
   }

   return null;
}