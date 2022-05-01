import Cow from "./entities/mobs/Cow";
import Slime from "./entities/mobs/Slime";
import { TileType } from "./tiles";

type MobNames = "Cow" | "Slime";

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
   },
   Slime: {
      preferredTileTypes: [TileType.grass, TileType.mud],
      packSize: 1,
      getConstr: () => Slime
   }
};

export default MOB_INFO_RECORD;