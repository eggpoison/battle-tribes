import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityComponentsData } from "webgl-test-shared/dist/components";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import { AudioFilePath } from "../sound";
import Entity from "../Entity";
export declare const TREE_HIT_SOUNDS: ReadonlyArray<AudioFilePath>;
export declare const TREE_DESTROY_SOUNDS: ReadonlyArray<AudioFilePath>;
declare class Tree extends Entity {
    static readonly LEAF_SPECK_COLOUR_LOW: readonly [number, number, number];
    static readonly LEAF_SPECK_COLOUR_HIGH: readonly [number, number, number];
    constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tree>);
    protected onHit(hitData: HitData): void;
    onDie(): void;
}
export default Tree;
