import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
declare class IceArrow extends Entity {
    constructor(position: Point, id: number, ageTicks: number);
    tick(): void;
    onRemove(): void;
    private createIceSpeckProjectile;
    onDie(): void;
}
export default IceArrow;
