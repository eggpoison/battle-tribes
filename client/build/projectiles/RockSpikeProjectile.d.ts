import Entity from "../Entity";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
declare class RockSpikeProjectile extends Entity {
    private static readonly SIZES;
    private static readonly SPRITE_TEXTURE_SOURCES;
    private static readonly ENTRANCE_SHAKE_AMOUNTS;
    private static readonly ENTRANCE_SHAKE_DURATION;
    private static readonly ENTRANCE_SCALE;
    private static readonly EXIT_SHAKE_DURATION;
    private static readonly EXIT_SHAKE_AMOUNTS;
    private readonly renderPart;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.rockSpikeProjectile>);
    tick(): void;
}
export default RockSpikeProjectile;
