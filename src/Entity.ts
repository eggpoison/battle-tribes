import Board, { Chunk } from "./Board";
import Component from "./Component";

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

   public tick(): void {
      for (const component of this.components) {
         if (typeof component.tick !== "undefined") {
            component.tick();
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
      
   public onCollision?(entity: Entity): void;

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
}

export default Entity;