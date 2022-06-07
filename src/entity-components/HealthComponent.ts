import Component from "../Component";
import Entity from "../entities/Entity";
import Game from "../Game";
import SETTINGS from "../settings";
import TransformComponent from "./TransformComponent";

class HealthComponent extends Component {
   private static readonly TIME_UNTIL_REGEN = 3;

   private health: number;
   
   private maxHealth: number;
   private readonly armour: number;
   private lifespan?: number;

   private lastHitTime: number = 0;
   private remainingIFrames = 0;

   constructor(maxHealth?: number, startingHealth?: number, armour?: number, lifespan?: number) {
      super();

      this.maxHealth = maxHealth || 1;
      this.health = startingHealth || this.maxHealth;
      this.armour = armour || 0;
      this.lifespan = lifespan;
   }

   public tick(): void {
      this.remainingIFrames--;

      if (typeof this.lifespan !== "undefined") {
         this.lifespan -= 1 / SETTINGS.tps;

         if (this.lifespan <= 0) {
            this.die(null);
         }
         return;
      }

      // Natural health regen
      const timeSinceLastHit = (Game.ticks - this.lastHitTime) / SETTINGS.tps;
      if (timeSinceLastHit >= HealthComponent.TIME_UNTIL_REGEN) {
         // Heal once every second
         const previousTimeSinceLastHit = (Game.ticks - this.lastHitTime + 1) / SETTINGS.tps;
         if (Math.floor(previousTimeSinceLastHit) !== Math.floor(timeSinceLastHit)) {
            this.doNaturalRegen();
         }
      }
   }

   private doNaturalRegen(): void {
      const healAmount = 0.5 + Math.pow(this.maxHealth, 0.75) / 10;
      this.heal(healAmount);
   }

   public setMaxHealth(maxHealth: number, setHealth: boolean): void {
      this.maxHealth = maxHealth;
      if (setHealth) this.health = maxHealth;
   }

   public getMaxHealth(): number {
      return this.maxHealth;
   }

   public setLifespan(lifespan: number): void {
      this.lifespan = lifespan;
   }

   public getHealth(): number {
      return this.health;
   }

   public isAlive(): boolean {
      return this.health > 0;
   }

   private calculateDamageDealt(damage: number): number {
      return Math.max(damage - this.armour, 0);
   }

   public isBeingHit(): boolean {
      return this.remainingIFrames > 0;
   }

   public heal(amount: number): void {
      this.health += amount;
      if (this.health > this.maxHealth) this.health = this.maxHealth;

      this.getEntity().callEvents("healthChange", amount);
   }

   public hurt(damage: number, source: Entity | null, knockbackStrength?: number, iframes?: number): void {
      if (this.remainingIFrames > 0) return;

      if (source !== null && typeof knockbackStrength === "undefined") {
         throw new Error("An entity source must have the knockback field!");
      }

      const damageDealt = this.calculateDamageDealt(damage);

      this.health -= this.calculateDamageDealt(damageDealt);
      this.getEntity().callEvents("healthChange", -damageDealt, source);

      if (this.health <= 0) {
         this.die(source);
         return;
      }

      this.remainingIFrames = typeof iframes !== "undefined" ? iframes : Entity.iframes;

      // Apply knockback
      if (source !== null) {
         const attackingEntityPosition = source.getComponent(TransformComponent)!.position;
         this.getEntity().getComponent(TransformComponent)!.applyKnockback(attackingEntityPosition, knockbackStrength);
      }

      // Refresh last hit time
      this.lastHitTime = Game.ticks;
   }

   private die(causeOfDeath: Entity | null): void {
      const entity = this.getEntity();
      entity.die(causeOfDeath);
   }
}

export default HealthComponent;