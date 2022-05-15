import { TileType } from "./tiles";

import Cow from "./entities/mobs/Cow";
import Slime from "./entities/mobs/Slime";
import Yeti from "./entities/mobs/Yeti";
import Zombie from "./entities/mobs/Zombie";
import Berry from "./entities/resources/Berry";
import Boulder from "./entities/resources/Boulder";
import Tree from "./entities/resources/Tree";
import LivingEntity from "./entities/LivingEntity";

type EntitySpawnRequirements = {
   readonly tileTypes: ReadonlyArray<TileType>;
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

export enum MobBehaviour {
   peaceful,
   neutral,
   hostile
}

export interface MobInfo extends EntityInfo {
   readonly packSize: number | [number, number];
   readonly behaviour: MobBehaviour;
}

export interface ResourceInfo extends EntityInfo {
   readonly weight: number;
}

const ENTITY_INFO: ReadonlyArray<MobInfo | ResourceInfo> = [
   // Tree
   {
      spawnRequirements: {
         tileTypes: [TileType.grass]
      },
      exp: 1,
      getConstr: () => Tree,
      weight: 5
   },
   // Berry
   {
      spawnRequirements: {
         tileTypes: [TileType.grass]
      },
      exp: 1,
      getConstr: () => Berry,
      weight: 4
   },
   // Boulder
   {
      spawnRequirements: {
         tileTypes: [TileType.grass, TileType.mountain]
      },
      exp: 3,
      getConstr: () => Boulder,
      weight: 1
   },
   // Cow
   {
      spawnRequirements: {
         tileTypes: [TileType.grass]
      },
      packSize: [2, 4],
      behaviour: MobBehaviour.peaceful,
      exp: 1,
      getConstr: () => Cow
   },
   // Slime
   {
      spawnRequirements: {
         tileTypes: [TileType.sludge]
      },
      packSize: [1, 2],
      behaviour: MobBehaviour.hostile,
      exp: 2,
      getConstr: () => Slime
   },
   // Zombie
   {
      spawnRequirements: {
         tileTypes: [TileType.grass],
         isNight: true
      },
      packSize: 1,
      behaviour: MobBehaviour.hostile,
      exp: 5,
      getConstr: () => Zombie,
      hasCustomSpawnProcess: true // Spawns through graveyards
   },
   // Yeti
   {
      spawnRequirements: {
         tileTypes: [TileType.snow]
      },
      packSize: 1,
      behaviour: MobBehaviour.hostile,
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