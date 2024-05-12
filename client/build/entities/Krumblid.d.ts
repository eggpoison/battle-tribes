import { HitData } from "webgl-test-shared/dist/client-server-types";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
declare class Krumblid extends Entity {
    private static readonly BLOOD_FOUNTAIN_INTERVAL;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.krumblid>);
    protected onHit(hitData: HitData): void;
    onDie(): void;
}
export default Krumblid;
