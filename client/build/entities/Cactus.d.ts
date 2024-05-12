import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
declare class Cactus extends Entity {
    static readonly RADIUS = 40;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.cactus>);
    protected onHit(): void;
    onDie(): void;
}
export default Cactus;
