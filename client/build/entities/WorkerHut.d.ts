import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
declare class WorkerHut extends Entity {
    static readonly SIZE = 88;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.workerHut>);
    protected onHit(): void;
    onDie(): void;
    updateFromData(data: EntityData<EntityType.warriorHut>): void;
}
export default WorkerHut;
