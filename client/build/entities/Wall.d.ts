import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { EntityData, HitData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
declare class Wall extends Entity {
    private static readonly NUM_DAMAGE_STAGES;
    private damageRenderPart;
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.wall>);
    private updateDamageRenderPart;
    updateFromData(data: EntityData<EntityType.wall>): void;
    protected onHit(hitData: HitData): void;
    onDie(): void;
}
export default Wall;
