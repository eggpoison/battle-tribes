import Cow from "../entities/mobs/Cow";
import Slime from "../entities/mobs/Slime";
import Yeti from "../entities/mobs/Yeti";
import Zombie from "../entities/mobs/Zombie";
import Berry from "../entities/resources/Berry";
import Boulder from "../entities/resources/Boulder";
import Tree from "../entities/resources/Tree";
import LivingEntity from "../entities/LivingEntity";
import { BiomeName } from "../terrain-generation";
import Flower from "../entities/resources/Flower";

type EntitySpawnRequirements = {
   readonly biomes: ReadonlyArray<BiomeName>;
   readonly isNight?: boolean;
}

export interface EntityInfo {
   readonly spawnRequirements: EntitySpawnRequirements;
   /** How much exp the entity drops when killed */
   readonly exp: number;
   getConstr: () => { new(...args: any[]): any };
   /** If true, the entity won't be spawned through conventional means */
   readonly hasCustomSpawnProcess?: boolean;
}

export type MobBehaviour = "peaceful" | "neutral" | "hostile";

export interface MobInfo extends EntityInfo {
   readonly packSize: number | [number, number];
   readonly behaviour: MobBehaviour;
   readonly spawnChance?: number;
}

export interface ResourceInfo extends EntityInfo {
   readonly weight: number;
}

const ENTITY_INFO: ReadonlyArray<MobInfo | ResourceInfo> = [
   // Flower
   {
      spawnRequirements: {
         biomes: ["Grasslands"]
      },
      exp: 0,
      getConstr: () => Flower,
      weight: 2
   },
   // Tree
   {
      spawnRequirements: {
         biomes: ["Grasslands"]
      },
      exp: 1,
      getConstr: () => Tree,
      weight: 5
   },
   // Berry
   {
      spawnRequirements: {
         biomes: ["Grasslands"]
      },
      exp: 1,
      getConstr: () => Berry,
      weight: 4
   },
   // Boulder
   {
      spawnRequirements: {
         biomes: ["Mountains"]
      },
      exp: 3,
      getConstr: () => Boulder,
      weight: 1
   },
   // Cow
   {
      spawnRequirements: {
         biomes: ["Grasslands"]
      },
      packSize: [2, 4],
      behaviour: "peaceful",
      exp: 1,
      getConstr: () => Cow
   },
   // Slime
   {
      spawnRequirements: {
         biomes: ["Swamp"]
      },
      packSize: [1, 2],
      behaviour: "hostile",
      exp: 2,
      getConstr: () => Slime
   },
   // Zombie
   {
      spawnRequirements: {
         biomes: ["Grasslands"],
         isNight: true
      },
      packSize: 1,
      behaviour: "hostile",
      exp: 5,
      getConstr: () => Zombie,
      hasCustomSpawnProcess: true // Spawns through graveyards
   },
   // Yeti
   {
      spawnRequirements: {
         biomes: ["Tundra"]
      },
      packSize: 1,
      behaviour: "hostile",
      spawnChance: 0.2,
      exp: 10,
      getConstr: () => Yeti
   }
];

export function getEntityInfo<T extends EntityInfo>(entity: LivingEntity<T>): T {
   for (const info of ENTITY_INFO) {
      if (entity instanceof info.getConstr()) {
         return info as unknown as T;
      }
   }

   console.log(entity);
   throw new Error("Couldn't find info for an entity!");
}

export default ENTITY_INFO;