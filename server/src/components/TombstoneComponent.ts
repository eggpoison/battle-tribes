import { ServerComponentType } from "battletribes-shared/components";
import { Entity } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { getStringLengthBytes, Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { Point, randAngle, randInt } from "battletribes-shared/utils";
import { createZombieConfig } from "../entities/mobs/zombie";
import { TransformComponentArray } from "./TransformComponent";
import { createEntity, destroyEntity, getEntityLayer, getGameTime, isNight } from "../world";
import TombstoneDeathManager from "../tombstone-deaths";
import { Hitbox } from "../hitboxes";

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

export class TombstoneComponent {
   public readonly tombstoneType = randInt(0, 2);

   /** Amount of spawned zombies that are alive currently */
   public numZombies = 0;
   public isSpawningZombie = false;
   public zombieSpawnTimer = 0;
   public zombieSpawnPositionX = -1;
   public zombieSpawnPositionY = -1;

   // @Speed: Polymorphism
   public readonly deathInfo = TombstoneDeathManager.popDeath();
}

export const TombstoneComponentArray = new ComponentArray<TombstoneComponent>(ServerComponentType.tombstone, true, getDataLength, addDataToPacket);
TombstoneComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
TombstoneComponentArray.preRemove = preRemove;

const generateZombieSpawnPosition = (tombstone: Entity): Point => {
   const transformComponent = TransformComponentArray.getComponent(tombstone);
   const tombstoneHitbox = transformComponent.hitboxes[0];
   
   const seenIs = new Array<number>();
   for (;;) {
      let i: number;
      do {
         i = randInt(0, 3);
      } while (seenIs.includes(i));

      const angleFromTombstone = i * Math.PI / 2;

      const offsetMagnitude = Vars.ZOMBIE_SPAWN_DISTANCE + (i % 2 === 0 ? 15 : 0);
      const x = tombstoneHitbox.box.position.x + offsetMagnitude * Math.sin(angleFromTombstone);
      const y = tombstoneHitbox.box.position.y + offsetMagnitude * Math.cos(angleFromTombstone);
   
      // Make sure the spawn position is valid
      if (x < 0 || x >= Settings.WORLD_UNITS || y < 0 || y >= Settings.WORLD_UNITS) {
         seenIs.push(i);
         if (seenIs.length === 4) {
            return new Point(-1, -1);
         }
      } else {
         return new Point(x, y);
      }
   }
}

const spawnZombie = (tombstone: Entity, tombstoneComponent: TombstoneComponent): void => {
   // Note: tombstone type 0 is the golden tombstone
   const isGolden = tombstoneComponent.tombstoneType === 0 && Math.random() < 0.005;
   
   // Spawn zombie
   const position = new Point(tombstoneComponent.zombieSpawnPositionX, tombstoneComponent.zombieSpawnPositionY);
   const config = createZombieConfig(position, randAngle(), isGolden, tombstone);
   createEntity(config, getEntityLayer(tombstone), 0);

   tombstoneComponent.numZombies++;
   tombstoneComponent.isSpawningZombie = false;
}

function onTick(tombstone: Entity): void {
   // If in the daytime, chance to crumble
   if (!isNight()) {
      const dayProgress = (getGameTime() - 6) / 12;
      const crumbleChance = Math.exp(dayProgress * 12 - 6);
      if (Math.random() < crumbleChance * Settings.DT_S) {
         // Crumble
         destroyEntity(tombstone);
         return;
      }
   }

   const tombstoneComponent = TombstoneComponentArray.getComponent(tombstone);

   // Start zombie spawn
   if (tombstoneComponent.numZombies < Vars.MAX_SPAWNED_ZOMBIES && !tombstoneComponent.isSpawningZombie) {
      if (Math.random() < Vars.ZOMBIE_SPAWN_RATE * Settings.DT_S) {
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
      tombstoneComponent.zombieSpawnTimer += Settings.DT_S;
      if (tombstoneComponent.zombieSpawnTimer >= Vars.ZOMBIE_SPAWN_TIME) {
         spawnZombie(tombstone, tombstoneComponent);
      }
   }
}

function preRemove(tombstone: Entity): void {
   // 60% chance to spawn zombie
   if (Math.random() < 0.4) {
      return;
   }
   
   // @Copynpaste
   const tombstoneComponent = TombstoneComponentArray.getComponent(tombstone);
   const isGolden = tombstoneComponent.tombstoneType === 0 && Math.random() < 0.005;
   
   const tombstoneTransformComponent = TransformComponentArray.getComponent(tombstone);
   const tombstoneHitbox = tombstoneTransformComponent.hitboxes[0];

   const config = createZombieConfig(tombstoneHitbox.box.position.copy(), randAngle(), isGolden, tombstone);
   createEntity(config, getEntityLayer(tombstone), 0);
}

function getDataLength(entity: Entity): number {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
   
   let lengthBytes = 5 * Float32Array.BYTES_PER_ELEMENT;
   if (tombstoneComponent.deathInfo !== null) {
      lengthBytes += getStringLengthBytes(tombstoneComponent.deathInfo.username);
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

const getZombieSpawnProgress = (tombstoneComponent: TombstoneComponent): number => {
   return tombstoneComponent.isSpawningZombie ? tombstoneComponent.zombieSpawnTimer / Vars.ZOMBIE_SPAWN_TIME : -1;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tombstoneComponent = TombstoneComponentArray.getComponent(entity);

   packet.writeNumber(tombstoneComponent.tombstoneType);
   packet.writeNumber(getZombieSpawnProgress(tombstoneComponent));
   packet.writeNumber(tombstoneComponent.zombieSpawnPositionX);
   packet.writeNumber(tombstoneComponent.zombieSpawnPositionY);

   packet.writeBool(tombstoneComponent.deathInfo !== null);
   if (tombstoneComponent.deathInfo !== null) {
      packet.writeString(tombstoneComponent.deathInfo.username);
      packet.writeNumber(tombstoneComponent.deathInfo.damageSource);
   }
}