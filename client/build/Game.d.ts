import { DecorationInfo, EntityDebugData, GameDataPacket, GrassTileInfo, RiverSteppingStoneData, ServerTileData, WaterRockData } from "webgl-test-shared/dist/client-server-types";
import { EnemyTribeData } from "webgl-test-shared/dist/techs";
import Tribe from "./Tribe";
import { Tile } from "./Tile";
declare abstract class Game {
    private static lastTime;
    private static numSkippablePackets;
    static queuedPackets: GameDataPacket[];
    static isRunning: boolean;
    private static isPaused;
    /** If the game has recevied up-to-date game data from the server. Set to false when paused */
    static isSynced: boolean;
    static hasInitialised: boolean;
    /** Amount of time the game is through the current frame */
    private static lag;
    static cursorPositionX: number | null;
    static cursorPositionY: number | null;
    static entityDebugData: EntityDebugData | null;
    static tribe: Tribe;
    static enemyTribes: ReadonlyArray<EnemyTribeData>;
    private static cameraData;
    private static cameraBuffer;
    private static timeData;
    private static timeBuffer;
    static setGameObjectDebugData(entityDebugData: EntityDebugData | undefined): void;
    static getGameObjectDebugData(): EntityDebugData | null;
    /** Starts the game */
    static start(): void;
    static stop(): void;
    static pause(): void;
    static unpause(): void;
    static getIsPaused(): boolean;
    static sync(): void;
    /**
     * Prepares the game to be played. Called once just before the game starts.
     */
    static initialise(tiles: Array<Array<Tile>>, waterRocks: ReadonlyArray<WaterRockData>, riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>, riverFlowDirections: Record<number, Record<number, number>>, edgeTiles: Array<ServerTileData>, edgeRiverFlowDirections: Record<number, Record<number, number>>, edgeRiverSteppingStones: ReadonlyArray<RiverSteppingStoneData>, grassInfo: Record<number, Record<number, GrassTileInfo>>, decorations: ReadonlyArray<DecorationInfo>): Promise<void>;
    static main(currentTime: number): void;
    private static update;
    private static updatePlayer;
    /**
     *
     * @param frameProgress How far the game is into the current frame (0 = frame just started, 0.99 means frame is about to end)
     */
    private static render;
    static getEnemyTribeData(tribeID: number): EnemyTribeData;
}
export default Game;
