import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
declare class SpearProjectile extends Entity {
    constructor(position: Point, id: number, ageTicks: number);
    onDie(): void;
}
export default SpearProjectile;
