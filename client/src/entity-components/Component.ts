import { HitboxWrapper } from "webgl-test-shared/dist/boxes/boxes";
import Entity from "../Entity";

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
   public onCollision?(collidingEntity: Entity, pushedHitbox: HitboxWrapper, pushingHitbox: HitboxWrapper): void;
}

export default Component;