import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
declare class WoodenArrowProjectile extends Entity {
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.woodenArrowProjectile>);
    onRemove(): void;
    onDie(): void;
}
export default WoodenArrowProjectile;
