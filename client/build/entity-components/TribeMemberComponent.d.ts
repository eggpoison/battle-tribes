import { ComponentData, ServerComponentType, TribeMemberComponentData } from "webgl-test-shared/dist/components";
import { TitleGenerationInfo, TribesmanTitle } from "webgl-test-shared/dist/titles";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
export declare function getTribesmanRadius(tribesman: Entity): number;
declare class TribeMemberComponent extends ServerComponent<ServerComponentType.tribeMember> {
    bodyRenderPart: RenderPart;
    handRenderParts: Array<RenderPart>;
    warPaintType: number;
    titles: TitleGenerationInfo[];
    private deathbringerEyeLights;
    constructor(entity: Entity, data: ComponentData<ServerComponentType.tribeMember>);
    private registerNewTitle;
    hasTitle(title: TribesmanTitle): boolean;
    private updateTitles;
    tick(): void;
    updateFromData(data: TribeMemberComponentData): void;
}
export default TribeMemberComponent;
