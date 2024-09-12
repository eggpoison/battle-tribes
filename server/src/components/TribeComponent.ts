import { EntityID, EntityType } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import Tribe from "../Tribe";
import { ComponentArray } from "./ComponentArray";
import { TribesmanAIComponentArray, getTribesmanRelationship } from "./TribesmanAIComponent";
import { TribeMemberComponentArray } from "./TribeMemberComponent";
import { PlantComponentArray } from "./PlantComponent";
import { GolemComponentArray } from "./GolemComponent";
import Board from "../Board";
import { TribeType } from "battletribes-shared/tribes";
import { StructureComponentArray } from "./StructureComponent";
import { Packet } from "battletribes-shared/packets";

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

export interface TribeComponentParams {
   tribe: Tribe | null;
   /** Tribe type of the new tribe in case a tribe isn't specified */
   tribeType: TribeType;
}

export class TribeComponent {
   public tribe: Tribe;

   constructor(params: TribeComponentParams) {
      if (params.tribe === null) {
         // Default to creating a new tribe
         this.tribe = new Tribe(params.tribeType, true);
      } else {
         this.tribe = params.tribe;
      }
   }
}

export const TribeComponentArray = new ComponentArray<TribeComponent>(ServerComponentType.tribe, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

export function getEntityRelationship(entity: EntityID, comparingEntity: EntityID): EntityRelationship {
   // More complex if the entity is an AI tribesman: take into account the personal relationship between the entities
   if (TribesmanAIComponentArray.hasComponent(entity) && TribeMemberComponentArray.hasComponent(comparingEntity)) {
      return getTribesmanRelationship(entity, comparingEntity);
   }

   // @Cleanup @Robustness: do this based on which components they have

   // Structures
   if (StructureComponentArray.hasComponent(comparingEntity)) {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      const comparingEntityTribeComponent = TribeComponentArray.getComponent(comparingEntity);

      if (comparingEntityTribeComponent.tribe === tribeComponent.tribe) {
         return EntityRelationship.friendlyBuilding;
      }
      return EntityRelationship.enemyBuilding;
   }
   
   const entityType = Board.getEntityType(comparingEntity)!;
   switch (entityType) {
      case EntityType.plant: {
         const plantComponent = PlantComponentArray.getComponent(comparingEntity);
         
         const tribeComponent = TribeComponentArray.getComponent(entity);
         const planterBoxTribeComponent = TribeComponentArray.getComponent(plantComponent.planterBox);

         return planterBoxTribeComponent.tribe === tribeComponent.tribe ? EntityRelationship.neutral : EntityRelationship.enemyBuilding;
      }
      // Friendlies
      case EntityType.player:
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior:
      case EntityType.woodenArrow:
      case EntityType.ballistaWoodenBolt:
      case EntityType.ballistaRock:
      case EntityType.ballistaFrostcicle:
      case EntityType.ballistaSlimeball:
      case EntityType.slingTurretRock:
      case EntityType.iceArrow: {
         const tribeComponent = TribeComponentArray.getComponent(entity);
         const comparingEntityTribeComponent = TribeComponentArray.getComponent(comparingEntity);

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
         const golemComponent = GolemComponentArray.getComponent(comparingEntity);
         return Object.keys(golemComponent.attackingEntities).length > 0 ? EntityRelationship.hostileMob : EntityRelationship.neutral;
      }
      // @Temporary
      case EntityType.frozenYeti: return EntityRelationship.hostileMob;
      
      // Hostile if attacking, neutral otherwise
      case EntityType.frozenYeti:
      case EntityType.yeti:
      case EntityType.slime: {
         const tribeComponent = TribeComponentArray.getComponent(entity);
         return tribeComponent.tribe.attackingEntities[comparingEntity] !== undefined ? EntityRelationship.hostileMob : EntityRelationship.neutral;
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
      case EntityType.spitPoisonArea:
      case EntityType.battleaxeProjectile:
      case EntityType.grassStrand: {
         return EntityRelationship.neutral;
      }
      // @Hack @Temporary
      default: {
         return EntityRelationship.neutral
      }
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   packet.addNumber(tribeComponent.tribe.id);
}

export function recruitTribesman(tribesman: EntityID, newTribe: Tribe): void {
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   tribeComponent.tribe = newTribe;
}