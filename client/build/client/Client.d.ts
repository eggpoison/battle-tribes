import { BuildingPlanData, PotentialBuildingPlanData, TribeWallData } from "webgl-test-shared/dist/ai-building-types";
import { AttackPacket, GameDataPacket, InitialGameDataPacket, ServerTileData, VisibleChunkBounds } from "webgl-test-shared/dist/client-server-types";
import { Point } from "webgl-test-shared/dist/utils";
import { BlueprintType } from "webgl-test-shared/dist/components";
import { TechID } from "webgl-test-shared/dist/techs";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { Tile } from "../Tile";
export type GameData = {
    readonly gameTicks: number;
    readonly tiles: Array<Array<Tile>>;
    readonly playerID: number;
};
export declare function getVisibleWalls(): ReadonlyArray<TribeWallData>;
export declare function getVisibleBuildingPlans(): ReadonlyArray<BuildingPlanData>;
export declare function getHoveredBuildingPlan(): BuildingPlanData | null;
export interface PotentialPlanStats {
    readonly minSafety: number;
    readonly maxSafety: number;
}
export declare function getPotentialPlanStats(potentialPlans: ReadonlyArray<PotentialBuildingPlanData>): PotentialPlanStats;
export declare function calculatePotentialPlanIdealness(potentialPlan: PotentialBuildingPlanData, potentialPlanStats: PotentialPlanStats): number;
declare abstract class Client {
    private static socket;
    static connectToServer(): Promise<boolean>;
    static requestSpawnPosition(): Promise<Point>;
    static requestInitialGameData(): Promise<InitialGameDataPacket>;
    /** Creates the socket used to connect to the server */
    private static createSocket;
    static disconnect(): void;
    /** Parses the server tile data array into an array of client tiles */
    static parseServerTileDataArray(serverTileDataArray: ReadonlyArray<ServerTileData>): Array<Array<Tile>>;
    static processGameDataPacket(gameDataPacket: GameDataPacket): void;
    private static updateTribe;
    /**
     * Updates the client's entities to match those in the server
     */
    private static updateEntities;
    private static updatePlayerInventory;
    private static inventoryHasChanged;
    private static createEntityFromData;
    private static registerTileUpdates;
    private static addHitboxesToEntity;
    private static registerGameDataSyncPacket;
    private static respawnPlayer;
    /**
     * Sends a message to all players in the server.
     * @param message The message to send to the other players
     */
    static sendChatMessage(message: string): void;
    static sendInitialPlayerData(username: string, tribeType: TribeType): void;
    static sendVisibleChunkBounds(visibleChunks: VisibleChunkBounds): void;
    static sendPlayerDataPacket(): void;
    static sendCraftingPacket(recipeIndex: number): void;
    static sendItemPickupPacket(entityID: number, inventoryName: string, itemSlot: number, amount: number): void;
    static sendItemReleasePacket(entityID: number, inventoryName: string, itemSlot: number, amount: number): void;
    static sendAttackPacket(attackPacket: AttackPacket): void;
    static sendItemUsePacket(): void;
    static sendHeldItemDropPacket(dropAmount: number, dropDirection: number): void;
    static sendItemDropPacket(itemSlot: number, dropAmount: number, dropDirection: number): void;
    static sendDeactivatePacket(): void;
    static sendActivatePacket(): void;
    static sendRespawnRequest(): void;
    static sendCommand(command: string): void;
    static sendTrackEntity(id: number | null): void;
    private static killPlayer;
    static sendSelectTech(techID: TechID): void;
    static sendUnlockTech(techID: TechID): void;
    static sendForceUnlockTech(techID: TechID): void;
    static sendStudyTech(studyAmount: number): void;
    static sendPlaceBlueprint(structureID: number, blueprintType: BlueprintType): void;
    static sendModifyBuilding(structureID: number, data: number): void;
    static sendDeconstructBuilding(structureID: number): void;
    static sendStructureInteract(structureID: number, interactData: number): void;
    static sendStructureUninteract(structureID: number): void;
    static sendRecruitTribesman(tribesmanID: number): void;
    static respondToTitleOffer(title: TribesmanTitle, isAccepted: boolean): void;
}
export default Client;
