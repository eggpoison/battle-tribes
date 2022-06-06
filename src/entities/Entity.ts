import Board, { Chunk } from "../Board";
import Component from "../Component";
import HealthComponent from "../entity-components/HealthComponent";
import HitboxComponent from "../entity-components/HitboxComponent";
import TransformComponent from "../entity-components/TransformComponent";
import ParticleSource, { ParticleSourceInfo } from "../particles/ParticleSource";
import SETTINGS from "../settings";
import STATUS_EFFECT_RECORD, { StatusEffectType } from "../data/status-effects";
import { Point } from "../utils";

export type EventType = "deathByEntity" | "healthChange" | "hurt" | "attack" | "killEntity" | "die";

type EventsObject = Partial<Record<EventType, Array<() => void>>>;

type StatusEffect = {
   readonly type: StatusEffectType;
   remainingDuration: number;
   age: number;
   readonly particleSource?: ParticleSource;
}

type Size = number | {
   readonly WIDTH: number;
   readonly HEIGHT: number;
}

abstract class Entity {
   public abstract readonly SIZE: Size;
   public abstract readonly name: string;
   
   public static readonly iframes: number = SETTINGS.entityInvulnerabilityDuration * SETTINGS.tps;
   

   public previousChunk?: Chunk;

   private readonly components = new Map<(abstract new (...args: any[]) => any), Component>();
   private readonly events: EventsObject = {};

   private readonly statusEffects: Partial<Record<StatusEffectType, StatusEffect>> = {};

   constructor(components: ReadonlyArray<Component>) {
      for (const component of components) {
         this.components.set(component.constructor as (new (...args: any[]) => any), component);

         component.setEntity(this);
         if (typeof component.onLoad !== "undefined") component.onLoad();
      }

      // Clear status effects on death
      this.createEvent("die", () => {
         const entries = Object.entries(this.statusEffects) as Array<[StatusEffectType, StatusEffect]>;
         for (const [type, statusEffect] of entries) {
            if (typeof statusEffect.particleSource !== "undefined") {
               statusEffect.particleSource.destroy();
            }
         }

         // Remove all status effects
         // This has to be done as otherwise entities which respawn can have status effects carry over between lives because garbage collection doesn't stab them
         const keys = Object.keys(this.statusEffects) as Array<StatusEffectType>;
         for (const key of keys) {
            delete this.statusEffects[key];
         }
      });
   }

   public onLoad?(): void;

   public getComponent<C extends Component>(constr: { new(...args: any[]): C }): C | null {
      const component = this.components.get(constr);
      return typeof component !== "undefined" ? (component as C) : null;
   }

   protected getCollidingEntities(): Array<Entity> {
      const hitboxComponent = this.getComponent(HitboxComponent);
      if (hitboxComponent === null) {
         throw new Error("Tried to get the collisions of an entity without a hitbox!");
      }

      return hitboxComponent.entitiesInCollision;
   }

   public tick(): void {
      // Tick components
      this.components.forEach(component => {
         if (typeof component.tick !== "undefined") {
            component.tick();
         }
      });

      // Update status effects
      const entries = Object.entries(this.statusEffects) as Array<[StatusEffectType, StatusEffect]>;
      for (const [type, statusEffect] of entries) {
         statusEffect.remainingDuration -= 1 / SETTINGS.tps;
         statusEffect.age += 1 / SETTINGS.tps;

         // Remove the status effect if it has expired
         if (statusEffect.remainingDuration <= 0) {
            // If the status effect had a particle source, remove it
            if (typeof statusEffect.particleSource !== "undefined") {
               statusEffect.particleSource.destroy();
            }
            
            delete this.statusEffects[type];

            continue;
         }

         const info = STATUS_EFFECT_RECORD[statusEffect.type];
         // Damage over time
         if (typeof info.effects.damageOverTime !== "undefined") {
            // Only damage the entity once every second
            const previousAge = statusEffect.age - 1 / SETTINGS.tps;
            if (Math.floor(previousAge) !== Math.floor(statusEffect.age)) {
               // Hurt the entity
               const healthComponent = this.getComponent(HealthComponent);
               if (healthComponent !== null) {
                  healthComponent.hurt(info.effects.damageOverTime, null)
               }
            }
         }
      }

      // Check collisions
      const hasCollisionFunc = typeof this.onCollision !== "undefined";
      const hasLeaveCollisionFunc = typeof this.onLeaveCollision !== "undefined";
      const hasDuringCollisionFunc = typeof this.duringCollision !== "undefined";

      const hitboxComponent = this.getComponent(HitboxComponent);
      if (hitboxComponent !== null && (hasCollisionFunc || hasLeaveCollisionFunc || hasDuringCollisionFunc)) {
         let newCollidingEntities: Array<Entity> = [];

         const collidingEntities = hitboxComponent.getCollisions();
         if (collidingEntities !== null) {
            newCollidingEntities = collidingEntities;
         }

         const unseenEntities = hitboxComponent.entitiesInCollision.slice();
         for (const entity of newCollidingEntities) {
            // If the entity was not previously in a collision
            if (!hitboxComponent.entitiesInCollision.includes(entity)) {
               if (hasCollisionFunc) this.onCollision!(entity);
               hitboxComponent.entitiesInCollision.push(entity);
            } else {
               unseenEntities.splice(unseenEntities.indexOf(entity), 1);
            }
         }

         for (const entity of unseenEntities) {
            if (hasLeaveCollisionFunc) this.onLeaveCollision!(entity);
            hitboxComponent.entitiesInCollision.splice(hitboxComponent.entitiesInCollision.indexOf(entity), 1);
         }

         if (hasDuringCollisionFunc) {
            for (const collidingEntity of hitboxComponent.entitiesInCollision) {
               this.duringCollision!(collidingEntity);
            }
         }
      }
   }

   public die(causeOfDeath: Entity | null): void {
      // deathByEntity events
      if (causeOfDeath !== null) {
         this.callEvents("deathByEntity", causeOfDeath);
      }
      
      this.callEvents("die");

      Board.removeEntity(this);
   }
      
   protected onCollision?(entity: Entity): void;

   protected onLeaveCollision?(entity: Entity): void;

   protected duringCollision?(entity: Entity): void;

   public createEvent(type: EventType, func: (...args: Array<any>) => void): void {
      if (this.events.hasOwnProperty(type)) {
         this.events[type]!.push(func);
      } else {
         this.events[type] = [func];
      }
   }

   public callEvents(type: EventType, ...args: Array<unknown>): void {
      if (!this.events.hasOwnProperty(type)) return;

      for (const func of this.events[type]!) (func as (args: unknown) => void)(args);
   }

   protected setMaxHealth(maxHealth: number): void {
      this.getComponent(HealthComponent)!.setMaxHealth(maxHealth, true);
   }

   public applyStatusEffect(type: StatusEffectType, duration: number): void {
      // Don't apply the status effect if it already exists
      if (this.statusEffects.hasOwnProperty(type)) {
         const statusEffect = this.statusEffects[type]!;

         // Refresh its duration
         if (duration > statusEffect.remainingDuration) statusEffect.remainingDuration = duration;

         return;
      }

      const info = STATUS_EFFECT_RECORD[type];

      let particleSource: ParticleSource | undefined = undefined;
      const transformComponent = this.getComponent(TransformComponent)!;
      if (transformComponent !== null) {
         // Create the particle source
         if (typeof info.particleSource !== "undefined") {
            const getPosition = (): Point => {
               return this.getComponent(TransformComponent)!.position.copy();
            }

            const particleSourceInfo: ParticleSourceInfo = { position: getPosition, ...info.particleSource };
            particleSource = new ParticleSource(particleSourceInfo);
         }
      }

      this.statusEffects[type] = {
         type: type,
         remainingDuration: duration,
         age: 0,
         particleSource: particleSource
      };
   }
}

export default Entity;