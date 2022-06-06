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
   readonly radius: number;
   readonly damage: number;
   readonly pierce: number;
   readonly knockbackStrength: number;
}
// abstract class BaseAttack implements BaseAttackInfo {
//    public abstract readonly type: string;

//    public getPosition: () => Point;
   
//    public readonly damage: number;
//    public readonly attackingEntity: Entity;
//    public readonly knockbackStrength: number;

//    constructor(attackInfo: BaseAttackInfo) {
//       this.getPosition = attackInfo.getPosition;
//       this.damage = attackInfo.damage;
//       this.attackingEntity = attackInfo.attackingEntity;
//       this.knockbackStrength = attackInfo.knockbackStrength;
//    }

//    public abstract getAttackedEntities(): Array<Entity>;
// }

// interface CircleAttackInfo extends BaseAttackInfo {
//     readonly radius: number;
// }
// export class CircleAttack extends BaseAttack implements CircleAttackInfo {
//    public readonly type = "circle";

//    public readonly radius: number;

//    constructor(attackInfo: CircleAttackInfo) {
//       super(attackInfo);

//       this.radius = attackInfo.radius;
//    }

//    public startAttack(): void {
//       const entitiesToAttack = this.getAttackedEntities();

//       for (const entity of entitiesToAttack) {
//          // Don't attack yourself
//          if (entity === this.attackingEntity) continue;

//          // If the entity can be attacked
//          const healthComponent = entity.getComponent(HealthComponent);
//          if (healthComponent !== null) {
//             // Attack it
//             this.attackingEntity.getComponent(AttackComponent)!.attack(entity, this);
//          }
//       }
//    }

//    public getAttackedEntities(): Array<Entity> {
//       const nearbyEntities = TransformComponent.getNearbyEntities(this.getPosition(), this.radius * Board.tileSize);

//       if (this.attackingEntity instanceof GenericTribeMember) {
//          for (let idx = nearbyEntities.length - 1; idx >= 0; idx--) {
//             const entity = nearbyEntities[idx];
            
//             if (entity instanceof GenericTribeMember && entity.tribe === this.attackingEntity.tribe) {
//                nearbyEntities.splice(idx, 1);
//             }
//          }
//       }

//       return nearbyEntities;
//    }
// }

// export type Attack = CircleAttack;

const getAttackedEntities = (attackInfo: AttackInfo): Array<Entity> => {
   const attackingEntityPosition = typeof attackInfo.position === "function" ? attackInfo.position() : attackInfo.position;

   const nearbyEntities = TransformComponent.getNearbyEntities(attackingEntityPosition, attackInfo.radius * Board.tileSize);

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
   // const originPoint = typeof attackInfo.origin !== "undefined" ? (typeof attackInfo.origin === "function" ? attackInfo.origin() : attackInfo.origin) : (typeof attackInfo.position === "function" ? attackInfo.position() : attackInfo.position);

   const sortedEntities = new Array<Entity>();

   const distanceMap = new Map<Entity, number>();

   for (const attackedEntity of attackedEntities) {
      const distance = attackInfo.attackingEntity.getComponent(TransformComponent)!.position.distanceFrom(attackedEntity.getComponent(TransformComponent)!.position);

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