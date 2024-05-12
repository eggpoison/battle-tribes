import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Tribesman from "./Tribesman";
declare class TribeWorker extends Tribesman {
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tribeWorker>);
}
export default TribeWorker;
