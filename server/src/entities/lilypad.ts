import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "battletribes-shared/collision";
import { Point } from "battletribes-shared/utils";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponent } from "../components/TransformComponent";
import { EntityType } from "../../../shared/src/entities";
import { CollisionGroup } from "../../../shared/src/collision-groups";

type ComponentTypes = ServerComponentType.transform;

export function createLilypadConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 24), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);

   return {
      entityType: EntityType.lilypad,
      components: {
         [ServerComponentType.transform]: transformComponent
      }
   };
}