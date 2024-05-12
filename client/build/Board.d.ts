import { GrassTileInfo, RiverSteppingStoneData, ServerTileData, ServerTileUpdateData } from "webgl-test-shared/dist/client-server-types";
import { Point, Vector } from "webgl-test-shared/dist/utils";
import Chunk from "./Chunk";
import { Tile } from "./Tile";
import Entity from "./Entity";
import Particle from "./Particle";
import Player from "./entities/Player";
import Fish from "./entities/Fish";
import RenderPart from "./render-parts/RenderPart";
export interface EntityHitboxInfo {
    readonly vertexPositions: readonly [Point, Point, Point, Point];
    readonly sideAxes: ReadonlyArray<Vector>;
}
declare abstract class Board {
    static ticks: number;
    static time: number;
    private static tiles;
    private static chunks;
    static edgeRiverFlowDirections: Record<number, Record<number, number>>;
    static grassInfo: Record<number, Record<number, GrassTileInfo>>;
    static numVisibleRenderParts: number;
    /** Game objects sorted in descending render weight */
    static readonly sortedEntities: Entity[];
    /** All fish in the board */
    static readonly fish: Fish[];
    static readonly entities: Set<Entity>;
    static readonly entityRecord: Record<number, Entity>;
    static readonly renderPartRecord: Record<number, RenderPart>;
    /** Stores all player entities in the game. Necessary for rendering their names. */
    static readonly players: Player[];
    static readonly lowMonocolourParticles: Particle[];
    static readonly lowTexturedParticles: Particle[];
    static readonly highMonocolourParticles: Particle[];
    static readonly highTexturedParticles: Particle[];
    private static riverFlowDirections;
    private static tickCallbacks;
    static initialise(tiles: Array<Array<Tile>>, riverFlowDirections: Record<number, Record<number, number>>, edgeTiles: Array<ServerTileData>, edgeRiverFlowDirections: Record<number, Record<number, number>>, grassInfo: Record<number, Record<number, GrassTileInfo>>): void;
    static addRiverSteppingStonesToChunks(steppingStones: ReadonlyArray<RiverSteppingStoneData>): void;
    static addTickCallback(time: number, callback: () => void): void;
    static updateTickCallbacks(): void;
    static tickIntervalHasPassed(intervalSeconds: number): boolean;
    static addEntity(entity: Entity): void;
    static removeEntity(entity: Entity, isDeath: boolean): void;
    static getRiverFlowDirection(tileX: number, tileY: number): number;
    static getEdgeRiverFlowDirection(tileX: number, tileY: number): number;
    static getTile(tileX: number, tileY: number): Tile;
    static tileIsWithinEdge(tileX: number, tileY: number): boolean;
    static getChunk(x: number, y: number): Chunk;
    private static updateParticleArray;
    static updateParticles(): void;
    /** Ticks all game objects without updating them */
    static tickEntities(): void;
    static updateEntities(): void;
    /** Updates the client's copy of the tiles array to match any tile updates that have occurred */
    static loadTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void;
    static tileIsInBoard(tileX: number, tileY: number): boolean;
    static hasEntityID(entityID: number): boolean;
}
export default Board;
