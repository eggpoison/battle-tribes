import Board from "../Board";
import Component from "../Component";
import Entity from "../entities/Entity";
import GenericTribeMember from "../entities/tribe-members/GenericTribeMember";
import { Point } from "../utils";
import HealthComponent from "./HealthComponent";
import TransformComponent from "./TransformComponent";

type AttackInfo = {
   readonly position: Point | (() => Point);
   /** Where the attack should sort the entities from */
   readonly origin?: Point | (() => Point);
   readonly attackingEntity: Entity;
   /** Radius of the check circle (in tiles) */
   readonly radius: number;
   readonly damage: number;
   /** How many enemies can be hit by the attack */
   readonly pierce: number;
   readonly knockbackStrength: number;
}

const getAttackedEntities = (attackInfo: AttackInfo): Array<Entity> => {
   const attackingEntityPosition = typeof attackInfo.position === "function" ? attackInfo.position() : attackInfo.position;

   const nearbyEntities = Board.getEntitiesInRange(attackingEntityPosition, attackInfo.radius * Board.tileSize);

   return nearbyEntities;
}

const filterAttackedEntities = (attackedEntities: Array<Entity>, attackInfo: AttackInfo): void => {
   // Don't attack yourself
   const selfIdx = attackedEntities.indexOf(attackInfo.attackingEntity);
   if (selfIdx !== -1) {
      attackedEntities.splice(selfIdx, 1);
   }

   for (let idx = attackedEntities.length - 1; idx >= 0; idx--) {
      const entity = attackedEntities[idx];
      
      // If the entity doesn't have a health component, don't attack it
      if (entity.getComponent(HealthComponent) === null) {
         attackedEntities.splice(idx, 1);
         continue;
      }

      // Don't attack tribe members which belong to the same tribe
      if (attackInfo.attackingEntity instanceof GenericTribeMember && entity instanceof GenericTribeMember) {
         if (entity.tribe === attackInfo.attackingEntity.tribe) {
            attackedEntities.splice(idx, 1);
            continue;
         }
      }
   }
}

const sortAttackedEntities = (attackedEntities: ReadonlyArray<Entity>, attackInfo: AttackInfo): void => {
   // Where the entities should be sorted from
   const originPoint = typeof attackInfo.origin !== "undefined" ? (typeof attackInfo.origin === "function" ? attackInfo.origin() : attackInfo.origin) : (typeof attackInfo.position === "function" ? attackInfo.position() : attackInfo.position);

   const sortedEntities = new Array<Entity>();

   const distanceMap = new Map<Entity, number>();

   for (const attackedEntity of attackedEntities) {
      const distance = originPoint.distanceFrom(attackedEntity.getComponent(TransformComponent)!.position);

      // Insert the entity into the sorted array
      let insertIdx = 0;
      for (const entity of sortedEntities) {
         // Get distance
         let distance2!: number;
         if (distanceMap.has(entity)) {
            distance2 = distanceMap.get(entity)!;
         } else {
            // Calculate distance
            distance2 = attackInfo.attackingEntity.getComponent(TransformComponent)!.position.distanceFrom(entity.getComponent(TransformComponent)!.position);
            // Add the distance to the distance map
            distanceMap.set(entity, distance2);
         }
         
         insertIdx++;

         // If the attacked entity is closer than the entity, insert the entity
         if (distance > distance2) {
            break;
         }
      }
      sortedEntities.splice(insertIdx, 0, attackedEntity);
   }

   attackedEntities = sortedEntities;
}

class AttackComponent extends Component {
   private attacks: { [key: string]: AttackInfo } = {};

   public addAttack(identifier: string, attackInfo: AttackInfo): void {
      this.attacks[identifier] = attackInfo;
   }

   public attack(attackInfo: AttackInfo | string): void {
      if (typeof attackInfo === "string") {
         this.runAttack(this.attacks[attackInfo]);
      } else {
         this.runAttack(attackInfo);
      }
   }

   private runAttack(attackInfo: AttackInfo): void {
      // Get attacked entities
      const attackedEntities = getAttackedEntities(attackInfo);
      // Filter out entities which can't be attacked
      filterAttackedEntities(attackedEntities, attackInfo);
      // Sort entities by how close they are
      sortAttackedEntities(attackedEntities, attackInfo);

      // Attack the closest entities
      const maxIdx = Math.min(attackInfo.pierce, attackedEntities.length);
      for (let i = 0; i < maxIdx; i++) {
         const closestEntity = attackedEntities[0];

         // Attack the entity
         const healthComponent = closestEntity.getComponent(HealthComponent)!;
         healthComponent.hurt(attackInfo.damage, attackInfo.attackingEntity, attackInfo.knockbackStrength);

         // If the entity was killed by the attack, call this entity's killEntity events
         if (healthComponent.getHealth() <= 0) {
            // console.log("test");
            this.getEntity().callEvents("killEntity", closestEntity);
         }

         // Remove the entity from the array to stop it being attacked twice
         attackedEntities.splice(0, 1);
      }
   }
}

export default AttackComponent;