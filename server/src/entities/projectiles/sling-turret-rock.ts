import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import {ServerComponentType } from "battletribes-shared/components";
import { EntityType, Entity } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { SlingTurretRockComponent } from "../../components/SlingTurretRockComponent";
import { Hitbox } from "../../hitboxes";

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