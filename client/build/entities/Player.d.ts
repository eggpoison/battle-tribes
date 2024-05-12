import { EntityType } from "webgl-test-shared/dist/entities";
import { ItemSlot } from "webgl-test-shared/dist/items";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import TribeMember from "./TribeMember";
import { HitData } from "webgl-test-shared/dist/client-server-types";
/** Updates the rotation of the player to match the cursor position */
export declare function updatePlayerRotation(cursorX: number, cursorY: number): void;
export declare function updateAvailableCraftingRecipes(): void;
export declare function getPlayerSelectedItem(): ItemSlot;
declare class Player extends TribeMember {
    /** The player entity associated with the current player. */
    static instance: Player | null;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.player>);
    static createInstancePlayer(position: Point, playerID: number): void;
    protected onHit(hitData: HitData): void;
    static resolveCollisions(): void;
    private static resolveBorderCollisions;
    private static resolveGameObjectCollisions;
    private static getPotentialCollidingEntities;
}
export default Player;
