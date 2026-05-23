import { DEFAULT_COLLISION_MASK, CollisionBit, EntityType, Entity, Point, HitboxCollisionType, RectangularBox } from "battletribes-shared";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { ProjectileComponent } from "../../components/ProjectileComponent.js";
import { SlingTurretRockComponent } from "../../components/SlingTurretRockComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createSlingTurretRockConfig(position: Point, rotation: number, owner: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 12, 64), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.arrowPassable, []);
   hitbox.isStatic = true;
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