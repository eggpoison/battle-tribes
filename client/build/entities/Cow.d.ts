import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
declare class Cow extends Entity {
    private static readonly HEAD_SIZE;
    /** How far the head overlaps the body */
    private static readonly HEAD_OVERLAP;
    private static readonly BODY_HEIGHT;
    private static readonly BLOOD_FOUNTAIN_INTERVAL;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.cow>);
    protected onHit(hitData: HitData): void;
    onDie(): void;
}
export default Cow;
