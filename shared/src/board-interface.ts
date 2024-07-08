import { EntityType } from "./entities";
import { Hitbox } from "./hitboxes/hitboxes";
import { Settings } from "./settings";
import { Point } from "./utils";

export interface EntityInfo<T extends EntityType = EntityType> {
   readonly type: T;
   readonly position: Readonly<Point>;
   readonly rotation: number;
   readonly id: number;
   readonly hitboxes: ReadonlyArray<Hitbox>;
}

export interface ChunkInfo<Entity extends EntityInfo> {
   readonly entities: Array<Entity>;
}

// @Cleanup: don't expose to outside packages
export type Chunks<Entity extends EntityInfo = EntityInfo> = ReadonlyArray<Readonly<ChunkInfo<Entity>>>

// @Cleanup: don't expose to outside packages
/** @internal */
export function getChunk<Entity extends EntityInfo = EntityInfo>(chunks: Chunks<Entity>, chunkX: number, chunkY: number): Readonly<ChunkInfo<Entity>> {
   const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
   return chunks[chunkIndex];
}