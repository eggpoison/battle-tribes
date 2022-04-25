import Entity from "./Entity";

abstract class Component {
   private entity!: Entity;

   public setEntity(entity: Entity): void {
      this.entity = entity;
   }

   protected getEntity(): Entity {
      return this.entity;
   }

   public tick?(): void;

   public onLoad?(): void;
}

export default Component;