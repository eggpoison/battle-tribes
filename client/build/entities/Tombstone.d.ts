import Entity from "../Entity";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
declare class Tombstone extends Entity {
    private static readonly HITBOX_WIDTH;
    private static readonly HITBOX_HEIGHT;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tombstone>);
    protected onHit(): void;
    onDie(): void;
}
export default Tombstone;
