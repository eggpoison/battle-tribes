import { Entity, EntityType } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import Tribe from "../Tribe";
import { ComponentArray } from "./ComponentArray";
import { TribesmanAIComponentArray, getTribesmanRelationship } from "./TribesmanAIComponent";
import { TribeMemberComponentArray } from "./TribeMemberComponent";
import { GolemComponentArray } from "./GolemComponent";
import { StructureComponentArray } from "./StructureComponent";
import { Packet } from "battletribes-shared/packets";
import { getEntityType } from "../world";
import { PlantedComponentArray } from "./PlantedComponent";
import { TransformComponentArray } from "./TransformComponent";
import { getHitboxTile, Hitbox } from "../hitboxes";
import { PlayerComponentArray } from "./PlayerComponent";

/** Relationships a tribe member can have, in increasing order of threat */
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

export const TribeComponentArray = new ComponentArray<TribeComponent>(ServerComponentType.tribe, true, getDataLength, addDataToPacket);
TribeComponentArray.onJoin = onJoin;
TribeComponentArray.onRemove = onRemove;

function onJoin(entity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   tribeComponent.tribe.registerEntity(entity);
}

function onRemove(entity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   tribeComponent.tribe.deregisterEntity(entity);
}

export function getEntityRelationship(entity: Entity, comparingEntity: Entity): EntityRelationship {
   // @SQUEAM
   if (PlayerComponentArray.hasComponent(comparingEntity) && PlayerComponentArray.getComponent(comparingEntity).client.username === "berryboy") {
      return EntityRelationship.enemy;
   }
   
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

   const entityType = getEntityType(comparingEntity);
   switch (entityType) {
      case EntityType.treePlanted:
      case EntityType.berryBushPlanted:
      case EntityType.iceSpikesPlanted: {
         const plantedComponent = PlantedComponentArray.getComponent(comparingEntity);
         
         const tribeComponent = TribeComponentArray.getComponent(entity);
         const planterBoxTribeComponent = TribeComponentArray.getComponent(plantedComponent.planterBox);

         return planterBoxTribeComponent.tribe === tribeComponent.tribe ? EntityRelationship.neutral : EntityRelationship.enemyBuilding;
      }
      // Projectiles, although they do belong to a tribe, damage every tribe. so they should just be considered neutral
      case EntityType.woodenArrow:
      case EntityType.ballistaWoodenBolt:
      case EntityType.ballistaRock:
      case EntityType.ballistaFrostcicle:
      case EntityType.ballistaSlimeball:
      case EntityType.slingTurretRock:
      case EntityType.iceArrow: {
         return EntityRelationship.neutral;
      }
      // Friendlies
      // @Hack @Hardcoded
      case EntityType.player:
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior:
      case EntityType.scrappy:
      case EntityType.cogwalker:{
         const tribeComponent = TribeComponentArray.getComponent(entity);
         const comparingEntityTribeComponent = TribeComponentArray.getComponent(comparingEntity);

         // @HACK @TEMPORARY
         if (typeof tribeComponent === "undefined") {
            return EntityRelationship.neutral;
         }
         
         if (comparingEntityTribeComponent.tribe === tribeComponent.tribe) {
            return EntityRelationship.friendly;
         }
         return EntityRelationship.enemy;
      }
      // Hostile mobs
      case EntityType.tombstone: // So that they try to destroy them
      case EntityType.zombie:
      case EntityType.pebblum:
      case EntityType.okren:
      case EntityType.inguSerpent: {
         return EntityRelationship.hostileMob;
      }
      // Golem (hostile mob / neutral)
      case EntityType.golem: {
         const golemComponent = GolemComponentArray.getComponent(comparingEntity);
         return Object.keys(golemComponent.attackingEntities).length > 0 ? EntityRelationship.hostileMob : EntityRelationship.neutral;
      }
      // Hostile if attacking a tribesman or on tribe territory, neutral otherwise
      case EntityType.yeti:
      case EntityType.slime:
      case EntityType.guardian: {
         const transformComponent = TransformComponentArray.getComponent(entity);
         // @Hack
         const hitbox = transformComponent.hitboxes[0];
         const tileIndex = getHitboxTile(hitbox);

         const tribeComponent = TribeComponentArray.getComponent(entity);
         return tribeComponent.tribe.tileIsInArea(tileIndex) || tribeComponent.tribe.attackingEntities[comparingEntity] !== undefined ? EntityRelationship.hostileMob : EntityRelationship.neutral;
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

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   packet.writeNumber(tribeComponent.tribe.id);
   // Not strictly necessary, as it can be inferred from the tribe data sent and the tribe ID,
   // but this helps eliminate/convert-to-warning crashes where a tribe ID gets sent but the data
   // for that tribe isn't sent for some reason.
   packet.writeNumber(tribeComponent.tribe.tribeType);
}

export function recruitTribesman(tribesman: Entity, newTribe: Tribe): void {
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   tribeComponent.tribe = newTribe;
}

export function entitiesBelongToSameTribe(entity1: Entity, entity2: Entity): boolean {
   const tribeComponent1 = TribeComponentArray.getComponent(entity1);
   const tribeComponent2 = TribeComponentArray.getComponent(entity2);
   return tribeComponent1.tribe === tribeComponent2.tribe;
}