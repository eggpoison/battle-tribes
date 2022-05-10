import Cow from "./entities/mobs/Cow";
import Slime from "./entities/mobs/Slime";
import Yeti from "./entities/mobs/Yeti";
import { TileType } from "./tiles";

type MobNames = "cow" | "slime" | "yeti";

export enum MobBehaviour {
   peaceful,
   neutral,
   hostile
}

export interface MobInfo {
   readonly preferredTileTypes: ReadonlyArray<TileType>;
   readonly packSize: number | [number, number];
   readonly behaviour: MobBehaviour;
   readonly exp: number;
   getConstr(): { new(...args: any[]): any };
}

type MobInfoRecord = Record<MobNames, MobInfo>;

const MOB_INFO_RECORD: MobInfoRecord = {
   cow: {
      preferredTileTypes: [TileType.grass],
      packSize: [2, 4],
      behaviour: MobBehaviour.peaceful,
      exp: 1,
      getConstr: () => Cow
   },
   slime: {
      preferredTileTypes: [TileType.sludge],
      packSize: [1, 2],
      behaviour: MobBehaviour.hostile,
      exp: 2,
      getConstr: () => Slime
   },
   yeti: {
      preferredTileTypes: [TileType.snow],
      packSize: 1,
      behaviour: MobBehaviour.hostile,
      exp: 10,
      getConstr: () => Yeti
   }
};

export default MOB_INFO_RECORD;