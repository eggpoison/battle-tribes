import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
declare class Zombie extends Entity {
    private static readonly RADIUS;
    private static readonly BLOOD_FOUNTAIN_INTERVAL;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.zombie>);
    tick(): void;
    protected onHit(hitData: HitData): void;
    onDie(): void;
}
export default Zombie;
