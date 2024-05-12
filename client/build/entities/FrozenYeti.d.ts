import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
declare class FrozenYeti extends Entity {
    private static readonly SIZE;
    private static readonly HEAD_SIZE;
    private static readonly HEAD_DISTANCE;
    private static readonly PAW_OFFSET;
    private static readonly PAW_RESTING_ANGLE;
    private static readonly PAW_HIGH_ANGLE;
    private static readonly ROAR_ARC;
    private static readonly ROAR_REACH;
    static readonly SNOWBALL_THROW_OFFSET = 150;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.frozenYeti>);
    tick(): void;
    private setPawRotationAndOffset;
    private createRoarParticles;
    protected onHit(hitData: HitData): void;
    onDie(): void;
}
export default FrozenYeti;
