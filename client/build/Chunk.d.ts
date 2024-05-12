import { RiverSteppingStoneData } from "webgl-test-shared/dist/client-server-types";
import Entity from "./Entity";
declare class Chunk {
    readonly x: number;
    readonly y: number;
    readonly entities: Entity[];
    readonly riverSteppingStones: RiverSteppingStoneData[];
    constructor(x: number, y: number);
    addEntity(entity: Entity): void;
    removeEntity(entity: Entity): void;
}
export default Chunk;
