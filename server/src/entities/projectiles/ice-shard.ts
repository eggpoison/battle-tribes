import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { IceShardComponent } from "../../components/IceShardComponent";
import { Hitbox } from "../../hitboxes";

export function createIceShardConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 24, 24), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const iceShardComponent = new IceShardComponent();
   
   return {
      entityType: EntityType.iceShardProjectile,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.iceShard]: iceShardComponent
      },
      lights: []
   };
}