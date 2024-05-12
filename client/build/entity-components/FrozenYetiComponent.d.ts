import { FrozenYetiComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { FrozenYetiAttackType } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import RenderPart from "../render-parts/RenderPart";
import Entity from "../Entity";
declare class FrozenYetiComponent extends ServerComponent<ServerComponentType.frozenYeti> {
    readonly headRenderPart: RenderPart;
    /** Index 0: left paw, index 1: right paw */
    readonly pawRenderParts: ReadonlyArray<RenderPart>;
    attackType: FrozenYetiAttackType;
    attackStage: number;
    stageProgress: number;
    constructor(entity: Entity, data: FrozenYetiComponentData, headRenderPart: RenderPart, pawRenderParts: ReadonlyArray<RenderPart>);
    updateFromData(data: FrozenYetiComponentData): void;
}
export default FrozenYetiComponent;
