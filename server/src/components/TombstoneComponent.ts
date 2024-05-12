import { TombstoneComponentData } from "webgl-test-shared/dist/components";
import { DeathInfo } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { TombstoneComponentArray } from "./ComponentArray";
import { getZombieSpawnProgress } from "../entities/tombstone";

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

   constructor(tombstoneType: number, deathInfo: DeathInfo | null) {
      this.tombstoneType = tombstoneType;
      this.deathInfo = deathInfo;
   }
}

export function serialiseTombstoneComponent(entity: Entity): TombstoneComponentData {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entity.id);
   return {
      tombstoneType: tombstoneComponent.tombstoneType,
      zombieSpawnProgress: getZombieSpawnProgress(tombstoneComponent),
      zombieSpawnX: tombstoneComponent.zombieSpawnPositionX,
      zombieSpawnY: tombstoneComponent.zombieSpawnPositionY,
      deathInfo: tombstoneComponent.deathInfo
   };
}