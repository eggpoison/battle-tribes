import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
declare class TribeTotem extends Entity {
    static readonly SIZE = 120;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tribeTotem>);
    protected onHit(): void;
    onDie(): void;
}
export default TribeTotem;
