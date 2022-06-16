import Board from "../Board";
import Chunk from "../Chunk";
import Component from "../Component";
import SETTINGS from "../settings";

export type EventType = "deathByEntity" | "healthChange" | "hurt" | "attack" | "killEntity" | "die" | "inventoryChange";

type EventsObject = Partial<Record<EventType, Array<() => void>>>;

type Size = number | {
   readonly WIDTH: number;
   readonly HEIGHT: number;
}

// The order in which entities are rendered
export enum RenderLayer {
   // (particle shadows get rendered before all)
   LowParticles,
   LowResources,
   Items,
   PeacefulEntities,
   HostileEntities,
   Tribesmen,
   HighResources,
   HighParticles
}

export type EntityRenderLayer = RenderLayer.LowResources | RenderLayer.Items | RenderLayer.PeacefulEntities | RenderLayer.HostileEntities | RenderLayer.Tribesmen | RenderLayer.HighResources;
export type ParticleRenderLayer = RenderLayer.LowParticles | RenderLayer.HighParticles;

abstract class Entity {
   public abstract readonly SIZE: Size;
   public abstract readonly name: string;
   
   public static readonly iframes: number = SETTINGS.entityInvulnerabilityDuration * SETTINGS.tps;
   
   public previousChunk?: Chunk;

   private readonly components = new Map<(abstract new (...args: any[]) => any), Component>();
   private readonly events: EventsObject = {};

   public renderLayer: EntityRenderLayer;

   constructor(renderLayer: EntityRenderLayer, components: ReadonlyArray<Component>) {
      this.renderLayer = renderLayer;

      for (const component of components) {
         this.components.set(component.constructor as (new (...args: any[]) => any), component);

         component.setEntity(this);
      }
   }

   public loadComponents(): void {
      this.components.forEach(component => {
         if (typeof component.onLoad !== "undefined") component.onLoad();
      });
   }

   public onLoad?(): void;

   public getComponent<C extends Component>(constr: { new(...args: any[]): C }): C | null {
      const component = this.components.get(constr);
      return typeof component !== "undefined" ? (component as C) : null;
   }

   public tick(): void {
      this.components.forEach(component => {
         if (typeof component.tick !== "undefined") {
            component.tick();
         }
      });
   }

   public die(causeOfDeath: Entity | null): void {
      // deathByEntity events
      if (causeOfDeath !== null) {
         this.callEvents("deathByEntity", causeOfDeath);
      }
      
      this.callEvents("die");

      Board.removeEntity(this);
   }
      
   public onCollision?(entity: Entity): void;

   public onLeaveCollision?(entity: Entity): void;

   public duringCollision?(entity: Entity): void;

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

   public destroy(): void {
      Board.removeEntity(this);
   }
}

export default Entity;