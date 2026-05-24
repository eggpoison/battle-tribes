import { Entity, EntityType, Point, Item, HitboxCollisionType, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared";
import { ItemComponent } from "../components/ItemComponent.js";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { FleshSwordItemComponent } from "../components/FleshSwordItemComponent.js";
import { AIHelperComponent } from "../components/AIHelperComponent.js";
import { Hitbox } from "../hitboxes.js";

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createFleshSwordItemEntityConfig(x: number, y: number, angle: number, item: Item, throwingEntity: Entity | null): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(x, y, 0, 0, angle, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const itemComponent = new ItemComponent(item, throwingEntity);

   const aiHelperComponent = new AIHelperComponent(hitbox, 250, moveFunc, turnFunc);
   
   const fleshSwordItemComponent = new FleshSwordItemComponent();
   
   return {
      entityType: EntityType.fleshSwordItemEntity,
      components: [
         transformComponent,
         itemComponent,
         aiHelperComponent,
         fleshSwordItemComponent
      ],
      lights: []
   };
}