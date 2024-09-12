import { EntityID, EntityType } from "./entities";
import { Hitbox } from "./boxes/boxes";
import { Settings } from "./settings";
import { Point } from "./utils";

export interface EntityInfo<T extends EntityType = EntityType> {
   readonly type: T;
   readonly position: Readonly<Point>;
   readonly rotation: number;
   readonly id: number;
   readonly hitboxes: ReadonlyArray<Hitbox>;
}

export interface ChunkInfo {
   readonly entities: Array<EntityID>;
}

// @Cleanup: don't expose to outside packages
export type Chunks = ReadonlyArray<Readonly<ChunkInfo>>

// @Cleanup: don't expose to outside packages
/** @internal */
export function getChunk(chunks: Chunks, chunkX: number, chunkY: number): Readonly<ChunkInfo> {
   const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
   return chunks[chunkIndex];
}