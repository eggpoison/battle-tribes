import Cow from "./entities/mobs/Cow";
import Slime from "./entities/mobs/Slime";
import { TileType } from "./tiles";

type MobNames = "Cow" | "Slime";

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
   Cow: {
      preferredTileTypes: [TileType.grass],
      packSize: [2, 4],
      behaviour: MobBehaviour.peaceful,
      exp: 1,
      getConstr: () => Cow
   },
   Slime: {
      preferredTileTypes: [TileType.sludge],
      packSize: 1,
      behaviour: MobBehaviour.hostile,
      exp: 2,
      getConstr: () => Slime
   }
};

export default MOB_INFO_RECORD;