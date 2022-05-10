import Berry from "./entities/resources/Berry";
import Boulder from "./entities/resources/Boulder";
import Tree from "./entities/resources/Tree";
import { TileType } from "./tiles";

type ResourceName = "tree" | "berry" | "boulder";

type ResourceSpawnRequirements = {
   readonly tileTypes?: ReadonlyArray<TileType>;
   readonly minDist?: number;
   readonly maxDist?: number;
}

export type ResourceInfo = {
   readonly spawnRequirements: ResourceSpawnRequirements;
   readonly weight: number;
   readonly getConstr: () => { new(...args: any[]): any };
}

const RESOURCE_INFO: Record<ResourceName, ResourceInfo> = {
   tree: {
      spawnRequirements: {
         tileTypes: [
            TileType.grass
         ]
      },
      weight: 5,
      getConstr: () => Tree
   },
   berry: {
      spawnRequirements: {
         tileTypes: [
            TileType.grass
         ]
      },
      weight: 4,
      getConstr: () => Berry
   },
   boulder: {
      spawnRequirements: {
         tileTypes: [
            TileType.grass,
            TileType.mountain
         ],
         minDist: 0.4
      },
   weight: 1,
      getConstr: () => Boulder
   }
};

export default RESOURCE_INFO;