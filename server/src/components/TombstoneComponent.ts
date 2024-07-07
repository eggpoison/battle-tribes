import { ServerComponentType, TombstoneComponentData } from "webgl-test-shared/dist/components";
import { DeathInfo } from "webgl-test-shared/dist/entities";
import { getZombieSpawnProgress } from "../entities/tombstone";
import { ComponentArray } from "./ComponentArray";

export interface TombstoneComponentParams {
   readonly tombstoneType: number;
   readonly deathInfo: DeathInfo | null;
}

export class TombstoneComponent {
   public readonly tombstoneType: number;

   /** Amount of spawned zombies that are alive currently */
   public numZombies = 0;
   public isSpawningZombie = false;
   public zombieSpawnTimer = 0;
   public zombieSpawnPositionX = -1;
   public zombieSpawnPositionY = -1;

   // @Speed: Polymorphism
   public readonly deathInfo: DeathInfo | null;

   constructor(params: TombstoneComponentParams) {
      this.tombstoneType = params.tombstoneType;
      this.deathInfo = params.deathInfo;
   }
}

export const TombstoneComponentArray = new ComponentArray<ServerComponentType.tombstone, TombstoneComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): TombstoneComponentData {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.tombstone,
      tombstoneType: tombstoneComponent.tombstoneType,
      zombieSpawnProgress: getZombieSpawnProgress(tombstoneComponent),
      zombieSpawnX: tombstoneComponent.zombieSpawnPositionX,
      zombieSpawnY: tombstoneComponent.zombieSpawnPositionY,
      deathInfo: tombstoneComponent.deathInfo
   };
}