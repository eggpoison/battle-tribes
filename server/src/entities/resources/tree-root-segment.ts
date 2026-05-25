import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, ItemType, randInt, createRectangularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TreeRootSegmentComponent } from "../../components/TreeRootSegmentComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";

registerEntityLootOnDeath(EntityType.treeRootSegment, {
   itemType: ItemType.wood,
   getAmount: () => randInt(1, 2)
});
   
export function createTreeRootSegmentConfig(x: number, y: number, angle: number, root: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 24, 40), 0.75, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const lootComponent = new LootComponent();
   
   const treeRootSegmentComponent = new TreeRootSegmentComponent(root);
   
   return {
      entityType: EntityType.treeRootSegment,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         treeRootSegmentComponent
      ],
      lights: []
   };
}