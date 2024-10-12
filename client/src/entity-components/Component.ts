import { Hitbox } from "battletribes-shared/boxes/boxes";
import Entity from "../Entity";
import { EntityID } from "../../../shared/src/entities";

abstract class Component {
   // @Memory: remove
   public readonly entity: Entity;

   constructor(entity: Entity) {
      this.entity = entity;
   }

   /** Called once when the entity is created, just after all the components are added */
   public onLoad?(): void;

   public onHit?(isDamagingHit: boolean): void;
   public onDie?(): void;
   public onRemove?(): void;
   public onCollision?(collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
}

export default Component;