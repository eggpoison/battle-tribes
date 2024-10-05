import { DecorationType, ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { TransformComponent } from "../components/TransformComponent";
import { DecorationComponent } from "../components/DecorationComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.decoration;

export function createDecorationConfig(decorationType: DecorationType): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), 50, 100, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const decorationComponent = new DecorationComponent(decorationType);
   
   return {
      entityType: EntityType.decoration,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.decoration]: decorationComponent
      }
   };
}