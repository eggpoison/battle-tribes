import { Tile } from "./Tile";
import Entity from "./Entity";
export declare let cursorX: number | null;
export declare let cursorY: number | null;
export declare function calculateCursorWorldPositionX(): number | null;
export declare function calculateCursorWorldPositionY(): number | null;
export declare function handleMouseMovement(e: MouseEvent): void;
/**
 * Finds the entity the user is hovering over.
 */
export declare function getMouseTargetTile(): Tile | null;
/**
 * Finds the entity the user is hovering over.
 */
export declare function getMouseTargetEntity(): Entity | null;
export declare function renderCursorTooltip(): void;
