import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
declare class BattleaxeProjectile extends Entity {
    constructor(position: Point, id: number, ageTicks: number);
    tick(): void;
    private playWhoosh;
}
export default BattleaxeProjectile;
