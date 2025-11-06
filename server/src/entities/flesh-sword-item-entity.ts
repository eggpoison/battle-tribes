import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { ItemComponent } from "../components/ItemComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { ItemType } from "battletribes-shared/items/items";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { FleshSwordItemComponent } from "../components/FleshSwordItemComponent";
import { AIHelperComponent } from "../components/AIHelperComponent";
import { Hitbox } from "../hitboxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/src/collision";

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createFleshSwordItemEntityConfig(position: Point, rotation: number, itemType: ItemType, amount: number, throwingEntity: Entity | null): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const itemComponent = new ItemComponent(itemType, amount, throwingEntity);

   const aiHelperComponent = new AIHelperComponent(hitbox, 250, moveFunc, turnFunc);
   
   const fleshSwordItemComponent = new FleshSwordItemComponent();
   
   return {
      entityType: EntityType.fleshSwordItemEntity,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.item]: itemComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.fleshSwordItem]: fleshSwordItemComponent
      },
      lights: []
   };
}