import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { createItemsOverEntity } from "../entity-shared";
import Board from "../Board";
import { TombstoneComponent, TombstoneComponentArray } from "../components/TombstoneComponent";
import { createZombieConfig } from "./mobs/zombie";
import TombstoneDeathManager from "../tombstone-deaths";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { TransformComponentArray } from "../components/TransformComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../components";
import { createEntityFromConfig } from "../Entity";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tombstone;
   
const WIDTH = 48;
const HEIGHT = 88;

/** Average number of zombies that are created by the tombstone in a second */
const ZOMBIE_SPAWN_RATE = 0.05;
/** Distance the zombies spawn from the tombstone */
const ZOMBIE_SPAWN_DISTANCE = 48;
/** Maximum amount of zombies that can be spawned by one tombstone */
const MAX_SPAWNED_ZOMBIES = 4;
/** Seconds it takes for a tombstone to spawn a zombie */
const ZOMBIE_SPAWN_TIME = 3;

export function createTombstoneConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.tombstone,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new RectangularHitbox(1.25, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, WIDTH, HEIGHT, 0)]
      },
      [ServerComponentType.health]: {
         maxHealth: 50
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.poisoned
      },
      [ServerComponentType.tombstone]: {
         tombstoneType: randInt(0, 2),
         deathInfo: TombstoneDeathManager.popDeath()
      }
   };
}

const generateZombieSpawnPosition = (tombstone: EntityID): Point => {
   const transformComponent = TransformComponentArray.getComponent(tombstone);
   
   const seenIs = new Array<number>();
   for (;;) {
      let i: number;
      do {
         i = randInt(0, 3);
      } while (seenIs.includes(i));

      const angleFromTombstone = i * Math.PI / 2;

      const offsetMagnitude = ZOMBIE_SPAWN_DISTANCE + (i % 2 === 0 ? 15 : 0);
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
   createEntityFromConfig(config);

   tombstoneComponent.numZombies++;
   tombstoneComponent.isSpawningZombie = false;
}

export function tickTombstone(tombstone: EntityID): void {
   // If in the daytime, chance to crumble
   if (Board.time > 6 && Board.time < 18) {
      const dayProgress = (Board.time - 6) / 12;
      const crumbleChance = Math.exp(dayProgress * 12 - 6);
      if (Math.random() < crumbleChance * Settings.I_TPS) {
         // Crumble
         Board.destroyEntity(tombstone);
         return;
      }
   }

   const tombstoneComponent = TombstoneComponentArray.getComponent(tombstone);

   // Start zombie spawn
   if (tombstoneComponent.numZombies < MAX_SPAWNED_ZOMBIES && !tombstoneComponent.isSpawningZombie) {
      if (Math.random() < ZOMBIE_SPAWN_RATE * Settings.I_TPS) {
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
      if (tombstoneComponent.zombieSpawnTimer >= ZOMBIE_SPAWN_TIME) {
         spawnZombie(tombstone, tombstoneComponent);
      }
   }
}

export function onTombstoneDeath(tombstone: EntityID, attackingEntity: EntityID | null): void {
   if (attackingEntity !== null && Math.random() < 0.6) {
      createItemsOverEntity(tombstone, ItemType.rock, randInt(2, 3), 40);

      const tombstoneTransformComponent = TransformComponentArray.getComponent(tombstone);

      const config = createZombieConfig();
      config[ServerComponentType.transform].position.x = tombstoneTransformComponent.position.x;
      config[ServerComponentType.transform].position.y = tombstoneTransformComponent.position.y;
      config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config[ServerComponentType.zombie].tombstone = tombstone;
      createEntityFromConfig(config);
   }
}


export function getZombieSpawnProgress(tombstoneComponent: TombstoneComponent): number {
   return tombstoneComponent.isSpawningZombie ? tombstoneComponent.zombieSpawnTimer / ZOMBIE_SPAWN_TIME : -1;
}