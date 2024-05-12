import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityData, HitData } from "webgl-test-shared/dist/client-server-types";
import RenderPart, { RenderObject } from "./render-parts/RenderPart";
import Chunk from "./Chunk";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import { Tile } from "./Tile";
import CircularHitbox from "./hitboxes/CircularHitbox";
import { ClientComponentClass, ClientComponentType, ServerComponentClass, ServerComponents } from "./entity-components/components";
export declare function setFrameProgress(newFrameProgress: number): void;
export declare function getFrameProgress(): number;
export declare function getRandomPointInEntity(entity: Entity): Point;
declare abstract class Entity extends RenderObject {
    readonly id: number;
    readonly type: EntityType;
    position: Point;
    velocity: Point;
    acceleration: Point;
    /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
    rotation: number;
    ageTicks: number;
    tile: Tile;
    /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
    readonly allRenderParts: RenderPart[];
    hitboxes: (RectangularHitbox | CircularHitbox)[];
    readonly hitboxHalfDiagonalLength?: number;
    chunks: Set<Chunk>;
    /** Visual depth of the game object while being rendered */
    renderDepth: number;
    /** Amount the game object's render parts will shake */
    shakeAmount: number;
    collisionBit: number;
    collisionMask: number;
    private readonly serverComponents;
    private readonly clientComponents;
    private readonly tickableComponents;
    private readonly updateableComponents;
    constructor(position: Point, id: number, type: EntityType, ageTicks: number);
    callOnLoadFunctions(): void;
    protected addServerComponent<T extends keyof typeof ServerComponents>(componentType: T, component: ServerComponentClass<T>): void;
    protected addClientComponent<T extends ClientComponentType>(componentType: T, component: ClientComponentClass<T>): void;
    getServerComponent<T extends keyof typeof ServerComponents>(componentType: T): ServerComponentClass<T>;
    getClientComponent<T extends ClientComponentType>(componentType: T): ClientComponentClass<T>;
    hasServerComponent(componentType: keyof typeof ServerComponents): boolean;
    attachRenderPart(renderPart: RenderPart): void;
    removeRenderPart(renderPart: RenderPart): void;
    addCircularHitbox(hitbox: CircularHitbox): void;
    addRectangularHitbox(hitbox: RectangularHitbox): void;
    remove(): void;
    protected onRemove?(): void;
    protected overrideTileMoveSpeedMultiplier?(): number | null;
    tick(): void;
    update(): void;
    isInRiver(): boolean;
    private applyPhysics;
    protected resolveBorderCollisions(): void;
    private updateCurrentTile;
    /** Recalculates which chunks the game object is contained in */
    private updateContainingChunks;
    updateRenderPosition(): void;
    private updateHitboxes;
    updateFromData(data: EntityData): void;
    die(): void;
    protected onDie?(): void;
    protected onHit?(hitData: HitData): void;
    registerHit(hitData: HitData): void;
    createHealingParticles(amountHealed: number): void;
}
export default Entity;
