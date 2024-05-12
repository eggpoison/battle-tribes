import { BuildingPlanData, BuildingSafetyData, SafetyNodeData, TribeWallData, WallConnectionData } from "./ai-building-types";
import { BlueprintType, EntityComponentsData } from "./components";
import { EntityType, LimbAction } from "./entities";
import { Inventory } from "./items";
import { StatusEffect } from "./status-effects";
import { EnemyTribeData, PlayerTribeData, TechID } from "./techs";
import { Biome, TileType } from "./tiles";
import { TribesmanTitle } from "./titles";
import { TribeType } from "./tribes";
export interface PlayerInventoryData {
    readonly hotbar: Inventory;
    readonly backpackSlot: Inventory;
    readonly backpackInventory: Inventory;
    /** Item currently being held by the player */
    readonly heldItemSlot: Inventory;
    /** Item held in the player's crafting output slot */
    readonly craftingOutputItemSlot: Inventory;
    readonly armourSlot: Inventory;
    readonly gloveSlot: Inventory;
    readonly offhand: Inventory;
}
export interface ServerTileData {
    readonly x: number;
    readonly y: number;
    readonly type: TileType;
    readonly biome: Biome;
    readonly isWall: boolean;
}
export type ServerTileUpdateData = {
    readonly tileIndex: number;
    readonly type: TileType;
    readonly isWall: boolean;
};
export declare const enum HitboxCollisionType {
    soft = 0,
    hard = 1
}
export interface BaseHitboxData {
    readonly mass: number;
    readonly offsetX: number;
    readonly offsetY: number;
    readonly collisionType: HitboxCollisionType;
    readonly localID: number;
}
export interface CircularHitboxData extends BaseHitboxData {
    readonly radius: number;
}
export interface RectangularHitboxData extends BaseHitboxData {
    readonly width: number;
    readonly height: number;
    readonly rotation: number;
}
export interface StatusEffectData {
    readonly type: StatusEffect;
    readonly ticksElapsed: number;
}
export declare const HitFlags: {
    HIT_BY_FLESH_SWORD: number;
    NON_DAMAGING_HIT: number;
};
export interface HitData {
    readonly entityPositionX: number;
    readonly entityPositionY: number;
    readonly hitEntityID: number;
    /** Used for client-side damage numbers */
    readonly damage: number;
    readonly knockback: number;
    readonly angleFromAttacker: number | null;
    readonly attackerID: number;
    readonly flags: number;
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
export interface EntityData<T extends EntityType = EntityType> {
    readonly id: number;
    readonly position: [number, number];
    readonly velocity: [number, number];
    readonly rotation: number;
    readonly rectangularHitboxes: ReadonlyArray<RectangularHitboxData>;
    readonly circularHitboxes: ReadonlyArray<CircularHitboxData>;
    readonly ageTicks: number;
    readonly type: T;
    readonly collisionBit: number;
    readonly collisionMask: number;
    readonly components: EntityComponentsData<T>;
}
export declare enum GameDataPacketOptions {
    sendVisiblePathfindingNodeOccupances = 1,
    sendVisibleSafetyNodes = 2,
    sendVisibleBuildingPlans = 4,
    sendVisibleBuildingSafetys = 8,
    sendVisibleRestrictedBuildingAreas = 16,
    sendVisibleWalls = 32,
    sendVisibleWallConnections = 64
}
/** Data about the game state sent to the client each tick */
export interface GameDataPacket {
    readonly entityDataArray: Array<EntityData<EntityType>>;
    readonly tileUpdates: ReadonlyArray<ServerTileUpdateData>;
    /** All hits taken by visible entities server-side */
    readonly hits: ReadonlyArray<HitData>;
    /** All healing received by visible entities server-side */
    readonly heals: ReadonlyArray<HealData>;
    readonly orbCompletes: ReadonlyArray<ResearchOrbCompleteData>;
    readonly inventory: PlayerInventoryData;
    /** How many ticks have passed in the server */
    readonly serverTicks: number;
    /** Current time of the server */
    readonly serverTime: number;
    readonly playerHealth: number;
    /** Extra debug information about a game object being tracked */
    readonly entityDebugData?: EntityDebugData;
    readonly playerTribeData: PlayerTribeData;
    readonly enemyTribesData: ReadonlyArray<EnemyTribeData>;
    readonly hasFrostShield: boolean;
    readonly pickedUpItem: boolean;
    readonly hotbarCrossbowLoadProgressRecord: Record<number, number>;
    readonly titleOffer: TribesmanTitle | null;
    readonly visiblePathfindingNodeOccupances: ReadonlyArray<PathfindingNodeIndex>;
    readonly visibleSafetyNodes: ReadonlyArray<SafetyNodeData>;
    readonly visibleBuildingPlans: ReadonlyArray<BuildingPlanData>;
    readonly visibleBuildingSafetys: ReadonlyArray<BuildingSafetyData>;
    readonly visibleRestrictedBuildingAreas: ReadonlyArray<RestrictedBuildingAreaData>;
    readonly visibleWalls: ReadonlyArray<TribeWallData>;
    readonly visibleWallConnections: ReadonlyArray<WallConnectionData>;
    readonly visibleEntityDeathIDs: ReadonlyArray<number>;
}
export declare enum WaterRockSize {
    small = 0,
    large = 1
}
export interface WaterRockData {
    readonly position: [number, number];
    readonly rotation: number;
    readonly size: WaterRockSize;
    readonly opacity: number;
}
export declare enum RiverSteppingStoneSize {
    small = 0,
    medium = 1,
    large = 2
}
export declare const RIVER_STEPPING_STONE_SIZES: Record<RiverSteppingStoneSize, number>;
export interface RiverSteppingStoneData {
    readonly positionX: number;
    readonly positionY: number;
    readonly rotation: number;
    readonly size: RiverSteppingStoneSize;
    /** ID of the group the stepping stone belongs to */
    readonly groupID: number;
}
export interface GrassTileInfo {
    readonly temperature: number;
    readonly humidity: number;
}
export declare enum DecorationType {
    pebble = 0,
    rock = 1,
    sandstoneRock = 2,
    sandstoneRockBig = 3,
    blackRockSmall = 4,
    blackRock = 5,
    snowPile = 6,
    flower1 = 7,
    flower2 = 8,
    flower3 = 9,
    flower4 = 10
}
export interface DecorationInfo {
    readonly positionX: number;
    readonly positionY: number;
    readonly rotation: number;
    readonly type: DecorationType;
    readonly variant: number;
}
export type RiverFlowDirections = Partial<Record<number, Partial<Record<number, number>>>>;
/** Initial data sent to the client */
export interface InitialGameDataPacket extends GameDataPacket {
    readonly playerID: number;
    readonly tiles: Array<ServerTileData>;
    readonly waterRocks: ReadonlyArray<WaterRockData>;
    readonly riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;
    readonly riverFlowDirections: RiverFlowDirections;
    readonly edgeTiles: Array<ServerTileData>;
    readonly edgeRiverFlowDirections: RiverFlowDirections;
    readonly edgeRiverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;
    readonly grassInfo: Record<number, Record<number, GrassTileInfo>>;
    readonly decorations: ReadonlyArray<DecorationInfo>;
}
export type VisibleChunkBounds = [minChunkX: number, maxChunkX: number, minChunkY: number, maxChunkY: number];
/** Data the player sends to the server each tick */
export type PlayerDataPacket = {
    readonly position: [number, number];
    readonly velocity: [number, number];
    readonly acceleration: [number, number];
    readonly rotation: number;
    readonly visibleChunkBounds: VisibleChunkBounds;
    readonly selectedItemSlot: number;
    readonly mainAction: LimbAction;
    readonly offhandAction: LimbAction;
    /** ID of the entity the player is interacting with */
    readonly interactingEntityID: number | null;
    readonly gameDataOptions: number;
};
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
    readonly inventory: PlayerInventoryData;
}
/** Data sent to the server when an attack is performed */
export interface AttackPacket {
    /** The item slot of the item which is being used to attack */
    readonly itemSlot: number;
    /** The direction that the attack is being done */
    readonly attackDirection: number;
}
export interface RespawnDataPacket {
    readonly playerID: number;
    readonly spawnPosition: [number, number];
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
    readonly pathNodes: ReadonlyArray<PathfindingNodeIndex>;
    readonly rawPathNodes: ReadonlyArray<PathfindingNodeIndex>;
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
export interface SocketData {
}
export interface ServerToClientEvents {
    spawn_position: (spawnPosition: [number, number]) => void;
    initial_game_data_packet: (gameDataPacket: InitialGameDataPacket) => void;
    game_data_packet: (gameDataPacket: GameDataPacket) => void;
    game_data_sync_packet: (gameDataSyncPacket: GameDataSyncPacket) => void;
    chat_message: (senderName: string, message: string) => void;
    client_disconnect: (clientID: string) => void;
    respawn_data_packet: (respawnDataPacket: RespawnDataPacket) => void;
    force_position_update: (position: [number, number]) => void;
}
export interface ClientToServerEvents {
    spawn_position_request: () => void;
    initial_player_data: (username: string, tribeType: TribeType) => void;
    visible_chunk_bounds: (visibleChunkBounds: VisibleChunkBounds) => void;
    initial_game_data_request: () => void;
    deactivate: () => void;
    activate: () => void;
    player_data_packet: (playerDataPacket: PlayerDataPacket) => void;
    chat_message: (message: string) => void;
    player_movement: (position: [number, number], movementHash: number) => void;
    crafting_packet: (recipeIndex: number) => void;
    item_pickup: (entityID: number, inventoryName: string, itemSlot: number, amount: number) => void;
    item_release: (entityID: number, inventoryName: string, itemSlot: number, amount: number) => void;
    attack_packet: (attackPacket: AttackPacket) => void;
    item_use_packet: (itemSlot: number) => void;
    held_item_drop: (dropAmount: number, dropDirection: number) => void;
    item_drop: (itemSlot: number, dropAmount: number, dropDirection: number) => void;
    respawn: () => void;
    command: (command: string) => void;
    track_game_object: (gameObjectID: number | null) => void;
    select_tech: (techID: TechID) => void;
    unlock_tech: (techID: TechID) => void;
    force_unlock_tech: (techID: TechID) => void;
    study_tech: (studyAmount: number) => void;
    place_blueprint: (structureID: number, blueprintType: BlueprintType) => void;
    modify_building: (buildingID: number, data: number) => void;
    deconstruct_building: (structureID: number) => void;
    structure_interact: (structureID: number, interactData: number) => void;
    /** Can be sent when the player stops interacting with a structure */
    structure_uninteract: (structureID: number) => void;
    recruit_tribesman: (tribesmanID: number) => void;
    respond_to_title_offer: (title: TribesmanTitle, isAccepted: boolean) => void;
}
export interface InterServerEvents {
}
