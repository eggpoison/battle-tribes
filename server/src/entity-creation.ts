import { EntityType, EntityTypeString, SlimeSize } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "./Entity";
import { createBerryBush } from "./entities/resources/berry-bush";
import { createBoulder } from "./entities/resources/boulder";
import { createCactus } from "./entities/resources/cactus";
import { createCow } from "./entities/mobs/cow";
import { createFish } from "./entities/mobs/fish";
import { createFrozenYeti } from "./entities/mobs/frozen-yeti";
import { createIceSpikes } from "./entities/resources/ice-spikes";
import { createKrumblid } from "./entities/mobs/krumblid";
import { createSlime } from "./entities/mobs/slime";
import { createSlimewisp } from "./entities/mobs/slimewisp";
import { createSnowball } from "./entities/snowball";
import { createTombstone } from "./entities/tombstone";
import { createTree } from "./entities/resources/tree";
import { createYeti } from "./entities/mobs/yeti";
import { createZombie } from "./entities/mobs/zombie";
import { createSpitPoison } from "./entities/projectiles/spit-poison";
import { createGolem } from "./entities/mobs/golem";
import { createPebblum } from "./entities/mobs/pebblum";
import { createTribeWorker } from "./entities/tribes/tribe-worker";

export function createEntity(position: Point, entityType: EntityType): Entity {
   switch (entityType) {
      case EntityType.berryBush: return createBerryBush(position, 2 * Math.PI * Math.random());
      case EntityType.boulder: return createBoulder(position, 2 * Math.PI * Math.random());
      case EntityType.cactus: return createCactus(position, 2 * Math.PI * Math.random());
      case EntityType.cow: return createCow(position, 2 * Math.PI * Math.random());
      case EntityType.fish: return createFish(position);
      case EntityType.frozenYeti: return createFrozenYeti(position);
      case EntityType.iceSpikes: return createIceSpikes(position, 2 * Math.PI * Math.random());
      case EntityType.krumblid: return createKrumblid(position);
      case EntityType.slime: return createSlime(position, SlimeSize.small, []);
      case EntityType.slimewisp: return createSlimewisp(position);
      case EntityType.snowball: return createSnowball(position).entity;
      case EntityType.tombstone: return createTombstone(position);
      case EntityType.tree: return createTree(position, 2 * Math.PI * Math.random());
      case EntityType.yeti: return createYeti(position);
      case EntityType.zombie: return createZombie(position, 2 * Math.PI * Math.random(), false, 0);
      case EntityType.spitPoison: return createSpitPoison(position, 2 * Math.PI * Math.random());
      case EntityType.golem: return createGolem(position);
      case EntityType.pebblum: return createPebblum(position, 2 * Math.PI * Math.random(), 0);
      case EntityType.tribeWorker: return createTribeWorker(position, 2 * Math.PI * Math.random(), -1, 0);
      case EntityType.fence:
      case EntityType.fenceGate:
      case EntityType.plant:
      case EntityType.planterBox:
      case EntityType.furnace:
      case EntityType.campfire:
      case EntityType.workbench:
      case EntityType.floorSpikes:
      case EntityType.wallSpikes:
      case EntityType.floorPunjiSticks:
      case EntityType.wallPunjiSticks:
      case EntityType.ballista:
      case EntityType.slingTurret:
      case EntityType.wall:
      case EntityType.door:
      case EntityType.embrasure:
      case EntityType.tunnel:
      case EntityType.slimeSpit:
      case EntityType.woodenArrowProjectile:
      case EntityType.iceArrow:
      case EntityType.player:
      case EntityType.iceShardProjectile:
      case EntityType.rockSpikeProjectile:
      case EntityType.spearProjectile:
      case EntityType.battleaxeProjectile:
      case EntityType.barrel:
      case EntityType.tribeWarrior:
      case EntityType.tribeTotem:
      case EntityType.workerHut:
      case EntityType.warriorHut:
      case EntityType.blueprintEntity:
      case EntityType.researchBench:
      case EntityType.healingTotem:
      case EntityType.itemEntity: throw new Error("Can't dynamically create entity of type '" + EntityTypeString[entityType] + "'.");
   }
}