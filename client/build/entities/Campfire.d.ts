import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
declare class Campfire extends Entity {
    static readonly SIZE = 104;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.campfire>);
    tick(): void;
}
export default Campfire;
