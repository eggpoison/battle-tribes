import { Hitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import Entity from "../Entity";

abstract class Component {
   public readonly entity: Entity;

   constructor(entity: Entity) {
      this.entity = entity;
   }

   public tick?(): void;
   public update?(): void;

   /** Called once when the entity is created, just after all the components are added */
   public onLoad?(): void;

   public onHit?(isDamagingHit: boolean): void;
   public onDie?(): void;
   public onRemove?(): void;
   public onCollision?(collidingEntity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
}

export default Component;