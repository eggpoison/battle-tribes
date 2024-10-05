import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Colour, Point, randInt } from "battletribes-shared/utils";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { TransformComponent } from "../components/TransformComponent";
import { LayeredRodComponent } from "../components/LayeredRodComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.layeredRod;

export function createReedConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), 4, 4, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const colour: Colour = {
      r: 0.68,
      g: 1,
      b: 0.66,
      a: 1
   };
   const layeredRodComponent = new LayeredRodComponent(randInt(7, 11), colour);
   
   return {
      entityType: EntityType.reed,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.layeredRod]: layeredRodComponent
      }
   };
}