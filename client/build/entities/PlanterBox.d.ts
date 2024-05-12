import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
declare class PlanterBox extends Entity {
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.planterBox>);
}
export default PlanterBox;
