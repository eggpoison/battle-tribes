import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { EntityConfig } from "../components";
import { GuardianGemQuakeComponent } from "../components/GuardianGemQuakeComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { Hitbox } from "../hitboxes";

export function createGuardianGemQuakeConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 10), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const guardianGemQuakeComponent = new GuardianGemQuakeComponent();
   
   return {
      entityType: EntityType.guardianGemQuake,
      components: [
         transformComponent,
         guardianGemQuakeComponent
      ],
      lights: []
   };
}