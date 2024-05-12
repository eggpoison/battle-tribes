import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
declare class Workbench extends Entity {
    static readonly SIZE = 80;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.workbench>);
}
export default Workbench;
