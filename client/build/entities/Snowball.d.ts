import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
declare class Snowball extends Entity {
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.snowball>);
    tick(): void;
    protected onHit(hitData: HitData): void;
    onDie(): void;
    private createSnowSpeckParticle;
}
export default Snowball;
