import { ItemComponent } from "../components/ItemComponent.js";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { FleshSwordItemComponent } from "../components/FleshSwordItemComponent.js";
import { AIHelperComponent } from "../components/AIHelperComponent.js";
import { createHitbox } from "../hitboxes.js";
import { createRectangularBox, HitboxCollisionType } from "../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/dist/collision.js";
import { Entity, EntityType } from "../../../shared/dist/entities.js";
import { Item } from "../../../shared/dist/items/items.js";

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createFleshSwordItemEntityConfig(x: number, y: number, angle: number, item: Item, throwingEntity: Entity | null): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox);
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