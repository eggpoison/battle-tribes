import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
declare class BerryBush extends Entity {
    private static readonly RADIUS;
    private static readonly LEAF_SPECK_COLOUR_LOW;
    private static readonly LEAF_SPECK_COLOUR_HIGH;
    static readonly TEXTURE_SOURCES: string[];
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.berryBush>);
    protected onHit(): void;
    onDie(): void;
}
export default BerryBush;
