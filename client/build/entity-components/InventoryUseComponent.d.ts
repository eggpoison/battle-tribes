import { LimbAction } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { InventoryUseComponentData, LimbData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
export interface LimbInfo {
    selectedItemSlot: number;
    readonly inventoryName: string;
    bowCooldownTicks: number;
    itemAttackCooldowns: Record<number, number>;
    spearWindupCooldowns: Record<number, number>;
    crossbowLoadProgressRecord: Record<number, number>;
    foodEatingTimer: number;
    action: LimbAction;
    lastAttackTicks: number;
    lastEatTicks: number;
    lastBowChargeTicks: number;
    lastSpearChargeTicks: number;
    lastBattleaxeChargeTicks: number;
    lastCrossbowLoadTicks: number;
    lastCraftTicks: number;
    thrownBattleaxeItemID: number;
    lastAttackCooldown: number;
    animationStartOffset: Point;
    animationEndOffset: Point;
    animationDurationTicks: number;
    animationTicksElapsed: number;
}
declare class InventoryUseComponent extends ServerComponent<ServerComponentType.inventoryUse> {
    readonly useInfos: ReadonlyArray<LimbInfo>;
    readonly limbRenderParts: RenderPart[];
    private readonly activeItemRenderParts;
    private readonly inactiveCrossbowArrowRenderParts;
    private readonly arrowRenderParts;
    customItemRenderPart: RenderPart | null;
    readonly bandageRenderParts: RenderPart[];
    constructor(entity: Entity, data: InventoryUseComponentData, handRenderParts: ReadonlyArray<RenderPart>);
    onLoad(): void;
    tick(): void;
    private updateActiveItemRenderPart;
    private updateLimb;
    update(): void;
    updateFromData(data: InventoryUseComponentData): void;
    getUseInfo(inventoryName: string): LimbData;
}
export default InventoryUseComponent;
