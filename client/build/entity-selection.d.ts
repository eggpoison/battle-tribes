import Entity from "./Entity";
export declare const enum TestEnum {
    obama = 28
}
export declare function getHoveredEntityID(): number;
export declare function getHighlightedEntityID(): number;
export declare function getSelectedEntityID(): number;
export declare function resetInteractableEntityIDs(): void;
export declare function getSelectedEntity(): Entity;
export declare function deselectSelectedEntity(closeInventory?: boolean): void;
export declare function deselectHighlightedEntity(): void;
export declare function updateHighlightedAndHoveredEntities(): void;
export declare function attemptEntitySelection(): void;
export declare function updateSelectedStructure(): void;
