import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
declare class Slimewisp extends Entity {
    private static readonly RADIUS;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.slimewisp>);
    protected overrideTileMoveSpeedMultiplier(): number | null;
    protected onHit(): void;
    onDie(): void;
}
export default Slimewisp;
