import Board, { Chunk } from "../Board";
import Component from "../Component";
import HealthComponent from "../entity-components/HealthComponent";
import HitboxComponent from "../entity-components/HitboxComponent";
import TransformComponent from "../entity-components/TransformComponent";
import SETTINGS from "../settings";
import { Point } from "../utils";

export enum EventType {
   deathByEntity,
   hurt,
   attack,
   killEntity
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

type Size = number | {
   readonly WIDTH: number;
   readonly HEIGHT: number;
}

abstract class Entity {
   public abstract readonly SIZE: Size;

   public static readonly iframes: number = SETTINGS.entityInvulnerabilityDuration * SETTINGS.tps;

   public previousChunk?: Chunk;

   private readonly components: ReadonlyArray<Component>;
   private readonly events: EventsObject = getEventsObject();

   constructor(components: ReadonlyArray<Component>) {
      this.components = components;

      for (const component of this.components) {
         component.setEntity(this);
         if (typeof component.onLoad !== "undefined") component.onLoad();
      }
   }

   public onLoad?(): void;

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

   public onDie(causeOfDeath: Entity | null): void {
      // deathByEntity events
      if (causeOfDeath !== null) {
         this.callEvents(EventType.deathByEntity);
      }

      Board.removeEntity(this);
   }
      
   protected onCollision?(entity: Entity): void;

   protected onLeaveCollision?(entity: Entity): void;

   protected duringCollision?(entity: Entity): void;

   // TODO: Figure out what the hell "constr: { new(...args: any[]): C }" means and why it works
   // Yoinked from https://itnext.io/entity-component-system-in-action-with-typescript-f498ca82a08e
   public getComponent<C extends Component>(constr: { new(...args: any[]): C }): C | null {
      for (const component of this.components) {
         if (component instanceof constr) {
            return component;
         }
      }

      return null;
   }

   public createEvent(type: EventType, func: (args?: any) => void): void {
      if (typeof type === "number") type = EventType[type] as unknown as EventType;

      this.events[type].push(func);
   }

   public callEvents(type: EventType, args?: unknown): void {
      if (typeof type === "number") type = EventType[type] as unknown as EventType;

      for (const func of this.events[type]) (func as (args: unknown) => void)(args);
   }

   protected setMaxHealth(maxHealth: number): void {
      this.getComponent(HealthComponent)!.setMaxHealth(maxHealth, true);
   }
}

export default Entity;