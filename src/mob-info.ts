import Cow from "./entities/mobs/Cow";
import { TileType } from "./tiles";

type MobNames = "Cow";

export interface MobInfo {
   readonly preferredTileTypes: ReadonlyArray<TileType>;
   readonly packSize: number | [number, number];
   getConstr(): { new(...args: any[]): any };
}

type MobInfoRecord = Record<MobNames, MobInfo>;

const MOB_INFO_RECORD: MobInfoRecord = {
   Cow: {
      preferredTileTypes: [TileType.grass],
      packSize: [2, 4],
      getConstr: () => Cow
   }
};

export default MOB_INFO_RECORD;