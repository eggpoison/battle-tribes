import Component from "./Component";

abstract class Entity {
   private components: Array<Component>;

   constructor(components: Array<Component>) {
      this.components = components;
   }

   public hasComponent(): void {
      
   }
}

export default Entity;