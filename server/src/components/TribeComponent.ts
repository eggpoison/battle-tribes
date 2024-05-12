import { EntityType } from "webgl-test-shared/dist/entities";
import { TribeComponentData } from "webgl-test-shared/dist/components";
import Tribe from "../Tribe";
import { GolemComponentArray, TribeComponentArray, TribeMemberComponentArray, TribesmanComponentArray } from "./ComponentArray";
import Entity from "../Entity";
import { getTribesmanRelationship } from "./TribesmanComponent";

// /** Relationships a tribe member can have, in increasing order of threat */
export const enum EntityRelationship {
   friendly = 1,
   friendlyBuilding = 1 << 1,
   acquaintance = 1 << 2,
   neutral = 1 << 3,
   hostileMob = 1 << 4,
   enemyBuilding = 1 << 5,
   enemy = 1 << 6
}

export class TribeComponent {
   public tribe: Tribe;

   constructor(tribe: Tribe) {
      this.tribe = tribe;
   }
}

export function getEntityRelationship(entityID: number, comparingEntity: Entity): EntityRelationship {
   // More complex if the entity is an AI tribesman: take into account the personal relationship between the entities
   if (TribesmanComponentArray.hasComponent(entityID) && TribeMemberComponentArray.hasComponent(comparingEntity.id)) {
      return getTribesmanRelationship(entityID, comparingEntity.id);
   }
   
   switch (comparingEntity.type) {
      // Buildings
      case EntityType.wall:
      case EntityType.fence:
      case EntityType.fenceGate:
      case EntityType.door:
      case EntityType.floorSpikes:
      case EntityType.wallSpikes:
      case EntityType.floorPunjiSticks:
      case EntityType.wallPunjiSticks:
      case EntityType.embrasure:
      case EntityType.ballista:
      case EntityType.slingTurret:
      case EntityType.blueprintEntity:
      case EntityType.tunnel:
      case EntityType.workerHut:
      case EntityType.warriorHut:
      case EntityType.tribeTotem:
      case EntityType.furnace:
      case EntityType.barrel:
      case EntityType.workbench:
      case EntityType.planterBox:
      case EntityType.researchBench:
      case EntityType.healingTotem:
      case EntityType.campfire: {
         const tribeComponent = TribeComponentArray.getComponent(entityID);
         const comparingEntityTribeComponent = TribeComponentArray.getComponent(comparingEntity.id);

         if (comparingEntityTribeComponent.tribe === tribeComponent.tribe) {
            return EntityRelationship.friendlyBuilding;
         }
         return EntityRelationship.enemyBuilding;
      }
      // Friendlies
      case EntityType.player:
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior:
      case EntityType.woodenArrowProjectile:
      case EntityType.iceArrow: {
         const tribeComponent = TribeComponentArray.getComponent(entityID);
         const comparingEntityTribeComponent = TribeComponentArray.getComponent(comparingEntity.id);

         if (comparingEntityTribeComponent.tribe === tribeComponent.tribe) {
            return EntityRelationship.friendly;
         }
         return EntityRelationship.enemy;
      }
      // Hostile mobs
      case EntityType.tombstone: // So that they try to destroy them
      case EntityType.zombie:
      case EntityType.pebblum: {
         return EntityRelationship.hostileMob;
      }
      // Golem (hostile mob / neutral)
      case EntityType.golem: {
         const golemComponent = GolemComponentArray.getComponent(comparingEntity.id);
         return Object.keys(golemComponent.attackingEntities).length > 0 ? EntityRelationship.hostileMob : EntityRelationship.neutral;
      }
      // @Temporary
      case EntityType.frozenYeti: return EntityRelationship.hostileMob;
      
      // Hostile if attacking, neutral otherwise
      case EntityType.frozenYeti:
      case EntityType.yeti:
      case EntityType.slime: {
         const tribeComponent = TribeComponentArray.getComponent(entityID);
         return tribeComponent.tribe.attackingEntities[comparingEntity.id] !== undefined ? EntityRelationship.hostileMob : EntityRelationship.neutral;
      }
      // Neutrals
      case EntityType.boulder:
      case EntityType.cactus:
      case EntityType.iceSpikes:
      case EntityType.berryBush:
      case EntityType.tree:
      case EntityType.cow:
      case EntityType.fish:
      case EntityType.iceShardProjectile:
      case EntityType.itemEntity:
      case EntityType.krumblid:
      case EntityType.rockSpikeProjectile:
      case EntityType.slimeSpit:
      case EntityType.slimewisp:
      case EntityType.snowball:
      case EntityType.spearProjectile:
      case EntityType.spitPoison:
      case EntityType.battleaxeProjectile:
      case EntityType.plant: {
         return EntityRelationship.neutral;
      }
      default: {
         const _unreachable: never = comparingEntity.type;
         return _unreachable;
      }
   }
}

export function serialiseTribeComponent(entity: Entity): TribeComponentData {
   const tribeComponent = TribeComponentArray.getComponent(entity.id);
   return {
      tribeID: tribeComponent.tribe.id
   };
}