import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
declare class Plant extends Entity {
    static readonly SIZE = 80;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.plant>);
    protected onHit(hitData: HitData): void;
    protected onDie(): void;
}
export default Plant;
