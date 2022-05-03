import Component from "../Component";
import Entity, { EventType } from "../entities/Entity";
import SETTINGS from "../settings";
import TransformComponent from "./TransformComponent";

class HealthComponent extends Component {
   private health: number;
   
   private maxHealth: number;
   private readonly regenerationRate: number;
   private readonly armour: number;
   private lifespan: number | null;

   private remainingIFrames = 0;

   constructor(maxHealth?: number, startingHealth?: number, regenerationRate?: number, armour?: number, lifespan?: number) {
      super();

      this.maxHealth = maxHealth || 1;
      this.health = startingHealth || this.maxHealth;
      this.regenerationRate = regenerationRate || 0;
      this.armour = armour || 0;
      this.lifespan = lifespan || null;
   }

   public tick(): void {
      this.remainingIFrames--;

      if (this.lifespan !== null) {
         this.lifespan -= 1 / SETTINGS.tps;

         if (this.lifespan <= 0) {
            this.die(null);
         }
         return;
      }

      const regenAmount = this.regenerationRate / SETTINGS.tps;
      this.health += regenAmount;
      if (this.health > this.maxHealth) this.health = this.maxHealth;
   }

   public setMaxHealth(maxHealth: number, setHealth: boolean): void {
      this.maxHealth = maxHealth;
      if (setHealth) this.health = maxHealth;
   }

   public getHealth(): number {
      return this.health;
   }

   private calculateDamageDealt(damage: number): number {
      return Math.max(damage - this.armour, 0);
   }

   public isBeingHit(): boolean {
      return this.remainingIFrames > 0;
   }

   public hurt(damage: number, attackingEntity: Entity, knockbackStrength: number): void {
      if (this.remainingIFrames > 0) return;

      this.health -= this.calculateDamageDealt(damage);

      this.getEntity().callEvents(EventType.hurt);

      this.remainingIFrames = Entity.iframes;

      if (this.health <= 0) {
         this.die(attackingEntity);
      } else {
         const attackingEntityPosition = attackingEntity.getComponent(TransformComponent)!.position;
         this.getEntity().getComponent(TransformComponent)!.applyKnockback(attackingEntityPosition, knockbackStrength);
      }
   }

   private die(causeOfDeath: Entity | null): void {
      const entity = this.getEntity();

      if (typeof entity.onDie !== "undefined") {
         entity.onDie(causeOfDeath);
      }
   }
}

export default HealthComponent;