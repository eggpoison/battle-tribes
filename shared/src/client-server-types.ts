import { LimbAction } from "./entities";
import { StatusEffect } from "./status-effects";
import { TileType } from "./tiles";

export type ServerTileUpdateData = {
   readonly layerIdx: number;
   readonly tileIndex: number;
   readonly type: TileType;
}

export interface StatusEffectData {
   readonly type: StatusEffect;
   readonly ticksElapsed: number;
}

export const HitFlags = {
   HIT_BY_FLESH_SWORD: 1 << 0,
   NON_DAMAGING_HIT: 1 << 1,
   HIT_BY_SPIKES: 1 << 2
};

export interface PlayerKnockbackData {
   readonly knockback: number;
   readonly knockbackDirection: number;
}

export interface HealData {
   readonly entityPositionX: number;
   readonly entityPositionY: number;
   /** ID of the entity that was healed */
   readonly healedID: number;
   /** ID of the entity that caused the healing to occur. -1 if no entity was responsible */
   readonly healerID: number;
   readonly healAmount: number;
}

export interface ResearchOrbCompleteData {
   readonly x: number;
   readonly y: number;
   readonly amount: number;
}

export enum GameDataPacketOptions {
   sendVisiblePathfindingNodeOccupances = 1 << 0,
   sendVisibleSafetyNodes = 1 << 1,
   sendVisibleBuildingPlans = 1 << 2,
   sendVisibleBuildingSafetys = 1 << 3,
   sendVisibleRestrictedBuildingAreas = 1 << 4,
   sendVisibleWalls = 1 << 5,
   sendVisibleWallConnections = 1 << 6,
   sendSubtileSupports = 1 << 7,
   sendLightLevels = 1 << 8
}

export enum WaterRockSize {
   small,
   large
}

export interface WaterRockData {
   readonly position: [number, number];
   readonly rotation: number;
   readonly size: WaterRockSize;
   readonly opacity: number;
}

export interface GrassTileInfo {
   readonly tileX: number;
   readonly tileY: number;
   readonly temperature: number;
   readonly humidity: number;
}

export type VisibleChunkBounds = [minChunkX: number, maxChunkX: number, minChunkY: number, maxChunkY: number];

/** Data the player sends to the server each tick */
export type PlayerDataPacket = {
   // @Vulnerability: Implement client-side prediction
   readonly position: [number, number]; // Point
   readonly velocity: [number, number];
   readonly acceleration: [number, number];
   readonly rotation: number;
   // @Vulnerability: Allows falsely sending way larger visible chunk bounds which can slow down the server a ton
   readonly visibleChunkBounds: VisibleChunkBounds;
   readonly selectedItemSlot: number;
   readonly mainAction: LimbAction;
   readonly offhandAction: LimbAction;
   /** ID of the entity the player is interacting with */
   readonly interactingEntityID: number | null;
   readonly gameDataOptions: number;
}

/** 
 * Data the server has about the player and game state.
 * Used when syncing a player with the server when they tab back into the game.
 *  */
export interface GameDataSyncPacket {
   readonly position: [number, number];
   readonly velocity: [number, number];
   readonly acceleration: [number, number];
   readonly rotation: number;
   readonly health: number;
}

/** Data sent to the server when an attack is performed */
export interface AttackPacket {
   /** The item slot of the item which is being used to attack */
   readonly itemSlot: number;
   /** The direction that the attack is being done */
   readonly attackDirection: number;
}

export interface DebugData {
   readonly colour: [r: number, g: number, b: number];
}

export interface LineDebugData extends DebugData {
   readonly targetPosition: [number, number];
   readonly thickness: number;
}

export interface CircleDebugData extends DebugData {
   readonly radius: number;
   readonly thickness: number;
}

export interface TileHighlightData extends DebugData {
   readonly tilePosition: [tileX: number, tileY: number];
}

export type PathfindingNodeIndex = number;

export interface PathData {
   readonly goalX: number;
   readonly goalY: number;
   readonly pathNodes: ReadonlyArray<PathfindingNodeIndex>;
   readonly rawPathNodes: ReadonlyArray<PathfindingNodeIndex>;
   readonly visitedNodes: ReadonlyArray<PathfindingNodeIndex>;
}

export interface EntityDebugData {
   /** ID of the entity being tracked */
   readonly entityID: number;
   readonly lines: Array<LineDebugData>;
   readonly circles: Array<CircleDebugData>;
   readonly tileHighlights: Array<TileHighlightData>;
   readonly debugEntries: Array<string>;
   readonly health?: number;
   readonly maxHealth?: number;
   readonly pathData?: PathData;
}

export interface RestrictedBuildingAreaData {
   readonly x: number;
   readonly y: number;
   readonly width: number;
   readonly height: number;
   readonly rotation: number;
}

export type RiverFlowDirectionsRecord = Partial<Record<number, Partial<Record<number, number>>>>;