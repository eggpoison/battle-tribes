import { BuildingMaterial, BuildingMaterialComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
export declare const WALL_TEXTURE_SOURCES: string[];
export declare const DOOR_TEXTURE_SOURCES: string[];
export declare const EMBRASURE_TEXTURE_SOURCES: string[];
export declare const TUNNEL_TEXTURE_SOURCES: string[];
export declare const FLOOR_SPIKE_TEXTURE_SOURCES: string[];
export declare const WALL_SPIKE_TEXTURE_SOURCES: string[];
declare class BuildingMaterialComponent extends ServerComponent<ServerComponentType.buildingMaterial> {
    private readonly materialRenderPart;
    material: BuildingMaterial;
    constructor(entity: Entity, data: BuildingMaterialComponentData, materialRenderPart: RenderPart);
    updateFromData(data: BuildingMaterialComponentData): void;
}
export default BuildingMaterialComponent;
