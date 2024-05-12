import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
declare class IceSpikes extends Entity {
    private static readonly ICE_SPECK_COLOUR;
    private static readonly SIZE;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.iceSpikes>);
    protected onHit(): void;
    onDie(): void;
    private createIceSpeckProjectile;
}
export default IceSpikes;
