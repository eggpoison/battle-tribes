import Entity from "../Entity";
import { Point } from "webgl-test-shared/dist/utils";
declare class SpitPoison extends Entity {
    private static readonly MAX_RANGE;
    private readonly trackSource;
    private readonly sound;
    constructor(position: Point, id: number, ageTicks: number);
    tick(): void;
    onRemove(): void;
}
export default SpitPoison;
