import { BuildingPlanData, BuildingSafetyData, SafetyNodeData, TribeWallData, WallConnectionData } from "./ai-building-types";
import { HitboxCollisionBit } from "./collision";
import { BlueprintType, ComponentData } from "./components";
import { EntitySummonPacket } from "./dev-packets";
import { EntityType, LimbAction } from "./entities";
import { AttackEffectiveness } from "./entity-damage-types";
import { EntityTickEvent } from "./entity-events";
import { GrassBlocker } from "./grass-blockers";
import { HitboxCollisionType } from "./hitboxes/hitboxes";
import { Inventory, InventoryName, ItemType } from "./items/items";
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
   // @Cleanup @Bandwidth: We don't need to send the x and y coordinates of a tile
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
}

export interface BaseHitboxData {
   readonly mass: number;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly collisionType: HitboxCollisionType;
   readonly collisionBit: HitboxCollisionBit;
   readonly collisionMask: number;
   readonly localID: number;
   readonly flags: number;
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

export const HitFlags = {
   HIT_BY_FLESH_SWORD: 1 << 0,
   NON_DAMAGING_HIT: 1 << 1,
   HIT_BY_SPIKES: 1 << 2
};

export interface HitData {
   readonly hitEntityID: number;
   readonly hitPosition: [number, number];
   readonly attackEffectiveness: AttackEffectiveness;
   readonly damage: number;
   readonly shouldShowDamageNumber: boolean;
   readonly flags: number;
}

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

export interface EntityData {
   readonly id: number;
   readonly type: EntityType;
   readonly components: ReadonlyArray<ComponentData>;
}

export enum GameDataPacketOptions {
   sendVisiblePathfindingNodeOccupances = 1 << 0,
   sendVisibleSafetyNodes = 1 << 1,
   sendVisibleBuildingPlans = 1 << 2,
   sendVisibleBuildingSafetys = 1 << 3,
   sendVisibleRestrictedBuildingAreas = 1 << 4,
   sendVisibleWalls = 1 << 5,
   sendVisibleWallConnections = 1 << 6
}

// @Cleanup: A whole bunch of the data in this for the player can be deduced from the entity data array
/** Data about the game state sent to the client each tick */
export interface GameDataPacket {
   readonly simulationIsPaused: boolean;
   readonly entityDataArray: Array<EntityData>;
   readonly tileUpdates: ReadonlyArray<ServerTileUpdateData>;
   /** All hits taken by visible entities server-side */
   readonly visibleHits: ReadonlyArray<HitData>;
   readonly playerKnockbacks: ReadonlyArray<PlayerKnockbackData>;
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
   readonly hotbarCrossbowLoadProgressRecord: Partial<Record<number, number>>;
   readonly titleOffer: TribesmanTitle | null;
   readonly tickEvents: ReadonlyArray<EntityTickEvent>;
   // @Cleanup @Bandwidth: move these all to a special dev info packet
   readonly visiblePathfindingNodeOccupances: ReadonlyArray<PathfindingNodeIndex>;
   readonly visibleSafetyNodes: ReadonlyArray<SafetyNodeData>;
   readonly visibleBuildingPlans: ReadonlyArray<BuildingPlanData>;
   readonly visibleBuildingSafetys: ReadonlyArray<BuildingSafetyData>;
   readonly visibleRestrictedBuildingAreas: ReadonlyArray<RestrictedBuildingAreaData>;
   readonly visibleWalls: ReadonlyArray<TribeWallData>;
   readonly visibleWallConnections: ReadonlyArray<WallConnectionData>;
   readonly visibleEntityDeathIDs: ReadonlyArray<number>;
   readonly visibleGrassBlockers: ReadonlyArray<GrassBlocker>;
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

export enum RiverSteppingStoneSize {
   small,
   medium,
   large
}

export const RIVER_STEPPING_STONE_SIZES: Record<RiverSteppingStoneSize, number> = {
   [RiverSteppingStoneSize.small]: 32,
   [RiverSteppingStoneSize.medium]: 48,
   [RiverSteppingStoneSize.large]: 56
};

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

export enum DecorationType {
   pebble,
   rock,
   sandstoneRock,
   sandstoneRockBig,
   blackRockSmall,
   blackRock,
   snowPile,
   flower1,
   flower2,
   flower3,
   flower4
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
export interface InitialGameDataPacket {
   readonly playerID: number;
   readonly spawnPosition: [number, number];
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

// Note to stupid future self: don't remove this, it's important
export interface SocketData {}

export interface ServerToClientEvents {
   initial_game_data_packet: (gameDataPacket: InitialGameDataPacket) => void;
   game_data_packet: (gameDataPacket: GameDataPacket) => void;
   game_data_sync_packet: (gameDataSyncPacket: GameDataSyncPacket) => void;
   chat_message: (senderName: string, message: string) => void;
   client_disconnect: (clientID: string) => void;
   respawn_data_packet: (respawnDataPacket: RespawnDataPacket) => void;
   force_position_update: (position: [number, number]) => void;
}

export interface ClientToServerEvents {
   initial_player_data: (username: string, tribeType: TribeType, screenWidth: number, screenHeight: number) => void;
   visible_chunk_bounds: (visibleChunkBounds: VisibleChunkBounds) => void;
   deactivate: () => void;
   activate: () => void;
   player_data_packet: (playerDataPacket: PlayerDataPacket) => void;
   chat_message: (message: string) => void;
   player_movement: (position: [number, number], movementHash: number) => void;
   crafting_packet: (recipeIndex: number) => void;
   item_pickup: (entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number) => void;
   // Tells the server that the client wants to release the held item at the specified place in an inventory
   item_release: (entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number) => void;
   // Effectively the item_pickup and item_release events combined
   attack_packet: (attackPacket: AttackPacket) => void;
   item_use_packet: (itemSlot: number) => void;
   held_item_drop: (dropAmount: number, dropDirection: number) => void;
   // For dropping items on the ground
   item_drop: (itemSlot: number, dropAmount: number, dropDirection: number) => void;
   // Tells the server to respawn the client
   respawn: () => void;
   command: (command: string) => void;
   // Tells the server to start sending debug information about a certain game object
   track_game_object: (gameObjectID: number) => void;
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

   // -------------------------- //
   //       DEV-ONLY EVENTS      //
   // -------------------------- //
   dev_give_item: (itemType: ItemType, amount: number) => void;
   dev_summon_entity: (summonPacket: EntitySummonPacket) => void;
   dev_give_title: (title: TribesmanTitle) => void;
   dev_remove_title: (title: TribesmanTitle) => void;
   dev_pause_simulation: () => void;
   dev_unpause_simulation: () => void;
   dev_create_tribe: () => void;
   dev_change_tribe_type: (tribeID: number, newTribeType: TribeType) => void;
}

export interface InterServerEvents {}