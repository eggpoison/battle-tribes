import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
declare class SlimeSpit extends Entity {
    private readonly renderParts;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.slimeSpit>);
    tick(): void;
    onDie(): void;
    private createPoisonParticle;
}
export default SlimeSpit;
