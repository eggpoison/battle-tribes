import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
declare class IceShardsProjectile extends Entity {
    constructor(position: Point, id: number, ageTicks: number);
}
export default IceShardsProjectile;
