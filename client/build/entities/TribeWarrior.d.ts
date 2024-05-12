import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Tribesman from "./Tribesman";
declare class TribeWarrior extends Tribesman {
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tribeWarrior>);
}
export default TribeWarrior;
