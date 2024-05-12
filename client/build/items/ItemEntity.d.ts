import { Point } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
export declare function createDeepFrostHeartBloodParticles(originX: number, originY: number, extraVelocityX: number, extraVelocityY: number): void;
declare class ItemEntity extends Entity {
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.itemEntity>);
}
export default ItemEntity;
