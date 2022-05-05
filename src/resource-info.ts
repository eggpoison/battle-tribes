import Berry from "./entities/resources/Berry";
import Tree from "./entities/resources/Tree";
import { TileType } from "./tiles";

type ResourceName = "tree" | "berry";

export type ResourceInfo = {
   readonly tiles: Array<TileType>;
   readonly weight: number;
   readonly getConstr: () => { new(...args: any[]): any };
}

const RESOURCE_INFO: Record<ResourceName, ResourceInfo> = {
   tree: {
      tiles: [
         TileType.grass
      ],
      weight: 5,
      getConstr: () => Tree
   },
   berry: {
      tiles: [
         TileType.grass
      ],
      weight: 4,
      getConstr: () => Berry
   }
};

export default RESOURCE_INFO;