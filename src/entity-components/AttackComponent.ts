import Board from "../Board";
import Component from "../Component";
import Entity, { EventType } from "../entities/Entity";
import { Point } from "../utils";
import HealthComponent from "./HealthComponent";
import TransformComponent from "./TransformComponent";
import TribeMemberComponent from "./TribeMemberComponent";

interface BaseAttackInfo {
   getPosition(): Point;
   readonly damage: number;
   readonly attackingEntity: Entity;
   readonly knockbackStrength: number;
}
abstract class BaseAttack implements BaseAttackInfo {
   public abstract readonly type: string;

   public getPosition: () => Point;
   
   public readonly damage: number;
   public readonly attackingEntity: Entity;
   public readonly knockbackStrength: number;

   constructor(attackInfo: BaseAttackInfo) {
      this.getPosition = attackInfo.getPosition;
      this.damage = attackInfo.damage;
      this.attackingEntity = attackInfo.attackingEntity;
      this.knockbackStrength = attackInfo.knockbackStrength;
   }

   public abstract getAttackedEntities(): Array<Entity>;
}

interface CircleAttackInfo extends BaseAttackInfo {
    readonly radius: number;
}
export class CircleAttack extends BaseAttack implements CircleAttackInfo {
   public readonly type = "circle";

   public readonly radius: number;

   constructor(attackInfo: CircleAttackInfo) {
      super(attackInfo);

      this.radius = attackInfo.radius;
   }

   public startAttack(): void {
      const entitiesToAttack = this.getAttackedEntities();

      for (const entity of entitiesToAttack) {
         // Don't attack yourself
         if (entity === this.attackingEntity) continue;

         // If the entity can be attacked
         const healthComponent = entity.getComponent(HealthComponent);
         if (healthComponent !== null) {
            // Attack it
            this.attackingEntity.getComponent(AttackComponent)!.attack(entity, this);
         }
      }
   }

   public getAttackedEntities(): Array<Entity> {
      const nearbyEntities = TransformComponent.getNearbyEntities(this.getPosition(), this.radius * Board.tileSize);

      const tribeComponent = this.attackingEntity.getComponent(TribeMemberComponent);
      if (tribeComponent !== null) {
         for (let idx = nearbyEntities.length - 1; idx >= 0; idx--) {
            const entity = nearbyEntities[idx];

            const entityTribeComponent = entity.getComponent(TribeMemberComponent);
            if (entityTribeComponent !== null && entityTribeComponent.tribe === tribeComponent.tribe) {
               nearbyEntities.splice(idx, 1);
            }
         }
      }

      return nearbyEntities;
   }
}

export type Attack = CircleAttack;

class AttackComponent extends Component {
   private readonly attacks: { [key: string]: Attack } = {};

   public startAttack(id: string): void {
      this.attacks[id].startAttack();
   }

   public addAttack(id: string, attack: Attack): void {
      this.attacks[id] = attack;
   }

   public attack(attackedEntity: Entity, attack: Attack): void {
      const healthComponent = attackedEntity.getComponent(HealthComponent)!;
      healthComponent.hurt(attack.damage, attack.attackingEntity, attack.knockbackStrength);

      if (healthComponent.getHealth() <= 0) {
         this.getEntity().callEvents(EventType.killEntity, attackedEntity);
      }
   }
}

export default AttackComponent;