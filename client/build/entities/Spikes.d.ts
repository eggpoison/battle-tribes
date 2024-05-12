import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
declare class Spikes extends Entity {
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.floorSpikes>);
    protected onHit(): void;
    onDie(): void;
}
export default Spikes;
