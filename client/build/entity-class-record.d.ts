import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import Entity from "./Entity";
export type EntityClassType<T extends EntityType> = new (position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<T>) => Entity;
declare const ENTITY_CLASS_RECORD: {
    [E in EntityType]: () => EntityClassType<E>;
};
export default ENTITY_CLASS_RECORD;
