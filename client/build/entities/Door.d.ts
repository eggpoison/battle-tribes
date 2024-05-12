import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
declare class Door extends Entity {
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.door>);
    protected onHit(hitData: HitData): void;
    onDie(): void;
}
export default Door;
