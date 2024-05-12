import Entity from "../Entity";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
declare class Boulder extends Entity {
    private static readonly RADIUS;
    private static readonly TEXTURE_SOURCES;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.boulder>);
    protected onHit(): void;
    onDie(): void;
}
export default Boulder;
