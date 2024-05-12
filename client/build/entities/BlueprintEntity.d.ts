import { BlueprintType, EntityComponentsData } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
interface ProgressTextureInfo {
    readonly progressTextureSources: ReadonlyArray<string>;
    readonly completedTextureSource: string;
    readonly offsetX: number;
    readonly offsetY: number;
    readonly rotation: number;
    readonly zIndex: number;
}
export declare const BLUEPRINT_PROGRESS_TEXTURE_SOURCES: Record<BlueprintType, ReadonlyArray<ProgressTextureInfo>>;
export declare function getCurrentBlueprintProgressTexture(blueprintType: BlueprintType, blueprintProgress: number): ProgressTextureInfo;
declare class BlueprintEntity extends Entity {
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.blueprintEntity>);
    onRemove(): void;
    updateFromData(data: EntityData<EntityType.blueprintEntity>): void;
    private updatePartialTexture;
}
export default BlueprintEntity;
