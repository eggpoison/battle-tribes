import { Chunk } from "./Board";
import Component from "./Component";

abstract class Entity {
   private components: Array<Component>;

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
}

export default Entity;