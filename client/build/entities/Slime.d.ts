import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
declare class Slime extends Entity {
    static readonly SIZES: ReadonlyArray<number>;
    static readonly SIZE_STRINGS: ReadonlyArray<string>;
    private static readonly NUM_PUDDLE_PARTICLES_ON_HIT;
    private static readonly NUM_PUDDLE_PARTICLES_ON_DEATH;
    private static readonly NUM_SPECK_PARTICLES_ON_HIT;
    private static readonly NUM_SPECK_PARTICLES_ON_DEATH;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.slime>);
    protected overrideTileMoveSpeedMultiplier(): number | null;
    updateFromData(entityData: EntityData<EntityType.slime>): void;
    protected onHit(): void;
    onDie(): void;
}
export default Slime;
