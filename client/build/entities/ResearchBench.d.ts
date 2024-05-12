import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
declare class ResearchBench extends Entity {
    static readonly WIDTH: number;
    static readonly HEIGHT: number;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.researchBench>);
}
export default ResearchBench;
