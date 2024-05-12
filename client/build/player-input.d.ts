import { StructureType } from "webgl-test-shared/dist/structures";
import { Item, PlaceableItemType } from "webgl-test-shared/dist/items";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
export declare let rightMouseButtonIsPressed: boolean;
export declare let leftMouseButtonIsPressed: boolean;
declare enum PlaceableItemHitboxType {
    circular = 0,
    rectangular = 1
}
export interface PlaceableEntityInfo {
    readonly entityType: StructureType;
    readonly width: number;
    readonly height: number;
    readonly hitboxType: PlaceableItemHitboxType;
    /** Optionally defines extra criteria for being placed */
    canPlace?(): boolean;
}
export declare const PLACEABLE_ENTITY_INFO_RECORD: Record<PlaceableItemType, PlaceableEntityInfo>;
export declare function updatePlayerItems(): void;
export declare function updateInventoryIsOpen(inventoryIsOpen: boolean): void;
/** Creates keyboard and mouse listeners for the player. */
export declare function createPlayerInputListeners(): void;
/** Updates the player's movement to match what keys are being pressed. */
export declare function updatePlayerMovement(): void;
export declare function selectItem(item: Item): void;
interface BuildingSnapInfo {
    /** -1 if no snap was found */
    readonly x: number;
    readonly y: number;
    readonly rotation: number;
    readonly entityType: EntityType;
    readonly snappedEntityID: number;
}
export declare function calculateSnapInfo(placeableEntityInfo: PlaceableEntityInfo, isVisualPosition: boolean): BuildingSnapInfo | null;
export declare function calculatePlacePosition(placeableEntityInfo: PlaceableEntityInfo, snapInfo: BuildingSnapInfo | null, isVisualPosition: boolean): Point;
export declare function calculatePlaceRotation(snapInfo: BuildingSnapInfo | null): number;
export declare function canPlaceItem(placePosition: Point, placeRotation: number, item: Item, placingEntityType: EntityType, isPlacedOnWall: boolean): boolean;
export declare function removeSelectedItem(item: Item): void;
export {};
