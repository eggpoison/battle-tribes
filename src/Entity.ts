import Board, { Chunk } from "./Board";
import Component from "./Component";
import HitboxComponent from "./entity-components/HitboxComponent";

export enum EventType {
   deathByEntity
}

type EventsObject = { [key in EventType]: Array<() => void> };

const eventTypeKeys = Object.keys(EventType).filter((_, i, arr) => i <= arr.length / 2);
const getEventsObject = (): EventsObject => {
   const eventsObject: Partial<EventsObject> = {};

   for (const key of eventTypeKeys) {
      const type = EventType[key as keyof typeof EventType];
      eventsObject[type] = new Array<() => void>();
   }

   return eventsObject as EventsObject;
}

abstract class Entity {
   private components: Array<Component>;

   private events: EventsObject = getEventsObject();

   public previousChunk?: Chunk;

   constructor(components: Array<Component>) {
      this.components = components;

      for (const component of this.components) {
         component.setEntity(this);
         if (typeof component.onLoad !== "undefined") component.onLoad();
      }
   }

   protected getCollidingEntities(): Array<Entity> {
      const hitboxComponent = this.getComponent(HitboxComponent);
      if (hitboxComponent === null) {
         throw new Error("Tried to get the collisions of an entity without a hitbox!");
      }

      return hitboxComponent.entitiesInCollision;
   }

   public tick(): void {
      for (const component of this.components) {
         if (typeof component.tick !== "undefined") {
            component.tick();
         }
      }

      // Check collisions

      const hasCollisionFunc = typeof this.onCollision !== "undefined";
      const hasLeaveCollisionFunc = typeof this.onLeaveCollision !== "undefined";

      const hitboxComponent = this.getComponent(HitboxComponent);
      if (hitboxComponent !== null && (hasCollisionFunc || hasLeaveCollisionFunc)) {
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
               unseenEntities.splice(unseenEntities.indexOf(entity));
            }
         }

         for (const entity of unseenEntities) {
            if (hasLeaveCollisionFunc) this.onLeaveCollision!(entity);
            hitboxComponent.entitiesInCollision.splice(hitboxComponent.entitiesInCollision.indexOf(entity));
         }
      }
   }

   public onDie(causeOfDeath: Entity | null): void {
      // deathByEntity events
      if (causeOfDeath !== null) {
         for (const func of this.events[EventType.deathByEntity]) func();
      }

      Board.removeEntity(this);
   }
      
   protected onCollision?(entity: Entity): void;

   protected onLeaveCollision?(entity: Entity): void;

   // TODO: Figure out what the hell "constr: { new(...args: any[]): C }" means and why it works.
   // Yoinked from https://itnext.io/entity-component-system-in-action-with-typescript-f498ca82a08e
   public getComponent<C extends Component>(constr: { new(...args: any[]): C }): C | null {
      for (const component of this.components) {
         if (component instanceof constr) {
            return component;
         }
      }

      return null;
   }

   public hasComponent<C extends Component>(constr: { new(...args: any[]): C }): boolean {
      for (const component of this.components) {
         if (component instanceof constr) {
            return true;
         }
      }
      return false;
   }

   public createEvent(type: EventType, func: () => void): void {
      this.events[type].push(func);
   }

   public callEvents(type: EventType): void {
      for (const func of this.events[type]) func();
   }
}

export default Entity;