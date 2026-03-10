import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { InguYetukLaserComponent } from "../../components/InguYetukLaserComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export function createInguYetukLaserConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 12), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [])
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const inguYetukLaserComponent = new InguYetukLaserComponent();

   return {
      entityType: EntityType.inguYetukLaser,
      components: [
         transformComponent,
         statusEffectComponent,
         inguYetukLaserComponent
      ],
      lights: []
   };
}
