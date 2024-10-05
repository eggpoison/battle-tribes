import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { Colour, Point, randFloat, randInt } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { TransformComponent } from "../components/TransformComponent";
import { LayeredRodComponent } from "../components/LayeredRodComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.layeredRod;
   
export function createGrassStrandConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), 4, 4, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const colour: Colour = {
      r: randFloat(0.4, 0.5),
      g: randFloat(0.83, 0.95),
      b: randFloat(0.2, 0.3),
      a: 1
   };
   const layeredRodComponent = new LayeredRodComponent(randInt(2, 5), colour);
   
   return {
      entityType: EntityType.grassStrand,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.layeredRod]: layeredRodComponent
      }
   };
}