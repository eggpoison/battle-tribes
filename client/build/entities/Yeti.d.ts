import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
declare class Yeti extends Entity {
    private static readonly SIZE;
    private static readonly PAW_START_ANGLE;
    private static readonly PAW_END_ANGLE;
    private static readonly SNOW_THROW_OFFSET;
    private static readonly BLOOD_POOL_SIZE;
    private static readonly BLOOD_FOUNTAIN_INTERVAL;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.yeti>);
    private createPaw;
    private updatePaws;
    tick(): void;
    protected onHit(hitData: HitData): void;
    onDie(): void;
}
export default Yeti;
