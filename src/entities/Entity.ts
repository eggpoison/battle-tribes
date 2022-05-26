import Board, { Chunk } from "../Board";
import Component from "../Component";
import HealthComponent from "../entity-components/HealthComponent";
import HitboxComponent from "../entity-components/HitboxComponent";
import SETTINGS from "../settings";

export type EventType = "deathByEntity" | "healthChange" | "attack" | "killEntity" | "die";

type EventsObject = Partial<Record<EventType, Array<() => void>>>;

type Size = number | {
   readonly WIDTH: number;
   readonly HEIGHT: number;
}

abstract class Entity {
   public abstract readonly SIZE: Size;

   public static readonly iframes: number = SETTINGS.entityInvulnerabilityDuration * SETTINGS.tps;

   public previousChunk?: Chunk;

   private readonly components = new Map<(abstract new (...args: any[]) => any), Component>();
   private readonly events: EventsObject = {};

   constructor(components: ReadonlyArray<Component>) {
      for (const component of components) {
         this.components.set(component.constructor as (new (...args: any[]) => any), component);

         component.setEntity(this);
         if (typeof component.onLoad !== "undefined") component.onLoad();
      }
   }

   public onLoad?(): void;

   public getComponent<C extends Component>(constr: { new(...args: any[]): C }): C | null {
      if (this.components.has(constr)) return this.components.get(constr) as C;

      return null;
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
         this.callEvents("deathByEntity");
      }

      Board.removeEntity(this);
      
      this.callEvents("die");
   }
      
   protected onCollision?(entity: Entity): void;

   protected onLeaveCollision?(entity: Entity): void;

   protected duringCollision?(entity: Entity): void;

   public createEvent(type: EventType, func: (args?: any) => void): void {
      if (this.events.hasOwnProperty(type)) {
         this.events[type]!.push(func);
      } else {
         this.events[type] = [func];
      }
   }

   public callEvents(type: EventType, args?: unknown): void {
      if (!this.events.hasOwnProperty(type)) return;

      for (const func of this.events[type]!) (func as (args: unknown) => void)(args);
   }

   protected setMaxHealth(maxHealth: number): void {
      this.getComponent(HealthComponent)!.setMaxHealth(maxHealth, true);
   }
}

export default Entity;