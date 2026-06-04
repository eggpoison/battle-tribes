import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { ProjectileComponent } from "../../components/ProjectileComponent.js";
import { SlingTurretRockComponent } from "../../components/SlingTurretRockComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { Entity, EntityType } from "../../../../shared/dist/entities.js";

export function createSlingTurretRockConfig(x: number, y: number, rotation: number, owner: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, rotation, 12, 64), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.arrowPassable);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const ownerTribeComponent = TribeComponentArray.getComponent(owner);
   const tribeComponent = new TribeComponent(ownerTribeComponent.tribe);
   
   const projectileComponent = new ProjectileComponent(owner);
   
   const slingTurretRockComponent = new SlingTurretRockComponent();
   
   return {
      entityType: EntityType.slingTurretRock,
      components: [
         transformComponent,
         tribeComponent,
         projectileComponent,
         slingTurretRockComponent
      ],
      lights: []
   };
}