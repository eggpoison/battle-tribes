import { ServerComponentType, SlimeComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class SlimeComponent extends ServerComponent<ServerComponentType.slime> {
    private static readonly EYE_OFFSETS;
    private static readonly EYE_SHAKE_START_FREQUENCY;
    private static readonly EYE_SHAKE_END_FREQUENCY;
    private static readonly EYE_SHAKE_START_AMPLITUDE;
    private static readonly EYE_SHAKE_END_AMPLITUDE;
    private readonly bodyRenderPart;
    private readonly eyeRenderPart;
    private readonly orbRenderParts;
    readonly size: number;
    private readonly orbs;
    private internalTickCounter;
    constructor(entity: Entity, data: SlimeComponentData);
    tick(): void;
    private createOrb;
    updateFromData(data: SlimeComponentData): void;
}
export default SlimeComponent;
