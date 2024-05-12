import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
declare class PunjiSticks extends Entity {
    private ticksSinceLastFly;
    private ticksSinceLastFlySound;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.floorPunjiSticks>);
    addRectangularHitbox(hitbox: RectangularHitbox): void;
    tick(): void;
    protected onHit(): void;
    onDie(): void;
}
export default PunjiSticks;
