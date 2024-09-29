import { ServerComponentType } from "battletribes-shared/components";
import { DeathInfo, EntityID } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import Layer from "../Layer";
import { createZombieConfig } from "../entities/mobs/zombie";
import { createEntityFromConfig } from "../Entity";
import { TransformComponentArray } from "./TransformComponent";
import { destroyEntity, getEntityLayer, getGameTime, isNight } from "../world";

const enum Vars {
   /** Average number of zombies that are created by the tombstone in a second */
   ZOMBIE_SPAWN_RATE = 0.05,
   /** Distance the zombies spawn from the tombstone */
   ZOMBIE_SPAWN_DISTANCE = 48,
   /** Maximum amount of zombies that can be spawned by one tombstone */
   MAX_SPAWNED_ZOMBIES = 4,
   /** Seconds it takes for a tombstone to spawn a zombie */
   ZOMBIE_SPAWN_TIME = 3
}

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

export const TombstoneComponentArray = new ComponentArray<TombstoneComponent>(ServerComponentType.tombstone, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const generateZombieSpawnPosition = (tombstone: EntityID): Point => {
   const transformComponent = TransformComponentArray.getComponent(tombstone);
   
   const seenIs = new Array<number>();
   for (;;) {
      let i: number;
      do {
         i = randInt(0, 3);
      } while (seenIs.includes(i));

      const angleFromTombstone = i * Math.PI / 2;

      const offsetMagnitude = Vars.ZOMBIE_SPAWN_DISTANCE + (i % 2 === 0 ? 15 : 0);
      const x = transformComponent.position.x + offsetMagnitude * Math.sin(angleFromTombstone);
      const y = transformComponent.position.y + offsetMagnitude * Math.cos(angleFromTombstone);
   
      // Make sure the spawn position is valid
      if (x < 0 || x >= Settings.BOARD_UNITS || y < 0 || y >= Settings.BOARD_UNITS) {
         seenIs.push(i);
         if (seenIs.length === 4) {
            return new Point(-1, -1);
         }
      } else {
         return new Point(x, y);
      }
   }
}

const spawnZombie = (tombstone: EntityID, tombstoneComponent: TombstoneComponent): void => {
   // Note: tombstone type 0 is the golden tombstone
   const isGolden = tombstoneComponent.tombstoneType === 0 && Math.random() < 0.005;
   
   // Spawn zombie
   const config = createZombieConfig();
   config[ServerComponentType.transform].position.x = tombstoneComponent.zombieSpawnPositionX;
   config[ServerComponentType.transform].position.y = tombstoneComponent.zombieSpawnPositionY;
   config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   if (isGolden) {
      config[ServerComponentType.zombie].zombieType = 3;
   }
   config[ServerComponentType.zombie].tombstone = tombstone;
   createEntityFromConfig(config, getEntityLayer(tombstone));

   tombstoneComponent.numZombies++;
   tombstoneComponent.isSpawningZombie = false;
}

export function tickTombstone(tombstone: EntityID): void {
   // If in the daytime, chance to crumble
   if (!isNight()) {
      const dayProgress = (getGameTime() - 6) / 12;
      const crumbleChance = Math.exp(dayProgress * 12 - 6);
      if (Math.random() < crumbleChance * Settings.I_TPS) {
         // Crumble
         destroyEntity(tombstone);
         return;
      }
   }

   const tombstoneComponent = TombstoneComponentArray.getComponent(tombstone);

   // Start zombie spawn
   if (tombstoneComponent.numZombies < Vars.MAX_SPAWNED_ZOMBIES && !tombstoneComponent.isSpawningZombie) {
      if (Math.random() < Vars.ZOMBIE_SPAWN_RATE * Settings.I_TPS) {
         // Start spawning a zombie
         tombstoneComponent.isSpawningZombie = true;
         tombstoneComponent.zombieSpawnTimer = 0;

         const zombieSpawnPosition = generateZombieSpawnPosition(tombstone);
         tombstoneComponent.zombieSpawnPositionX = zombieSpawnPosition.x;
         tombstoneComponent.zombieSpawnPositionY = zombieSpawnPosition.y;
      }
   }

   // Spawn zombies
   if (tombstoneComponent.isSpawningZombie) {
      tombstoneComponent.zombieSpawnTimer += Settings.I_TPS;
      if (tombstoneComponent.zombieSpawnTimer >= Vars.ZOMBIE_SPAWN_TIME) {
         spawnZombie(tombstone, tombstoneComponent);
      }
   }
}

function getDataLength(entity: EntityID): number {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
   
   let lengthBytes = 6 * Float32Array.BYTES_PER_ELEMENT;
   if (tombstoneComponent.deathInfo !== null) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT + 100 + Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

const getZombieSpawnProgress = (tombstoneComponent: TombstoneComponent): number => {
   return tombstoneComponent.isSpawningZombie ? tombstoneComponent.zombieSpawnTimer / Vars.ZOMBIE_SPAWN_TIME : -1;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entity);

   packet.addNumber(tombstoneComponent.tombstoneType);
   packet.addNumber(getZombieSpawnProgress(tombstoneComponent));
   packet.addNumber(tombstoneComponent.zombieSpawnPositionX);
   packet.addNumber(tombstoneComponent.zombieSpawnPositionY);

   packet.addBoolean(tombstoneComponent.deathInfo !== null);
   packet.padOffset(3);
   if (tombstoneComponent.deathInfo !== null) {
      // @Hack: hardcoded
      packet.addString(tombstoneComponent.deathInfo.username, 100);
      packet.addNumber(tombstoneComponent.deathInfo.causeOfDeath);
   }
}