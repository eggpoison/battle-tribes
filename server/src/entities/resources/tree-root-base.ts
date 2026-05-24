import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, ItemType, Point, randInt } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TreeRootBaseComponent } from "../../components/TreeRootBaseComponent.js";
import { Hitbox } from "../../hitboxes.js";
   
registerEntityLootOnDeath(EntityType.treeRootBase, {
   itemType: ItemType.wood,
   getAmount: () => randInt(2, 3)
});

export function createTreeRootBaseConfig(x: number, y: number, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, rotation, 17), 1.25, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(15);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const lootComponent = new LootComponent();
   
   const treeRootBaseComponent = new TreeRootBaseComponent();
   
   return {
      entityType: EntityType.treeRootBase,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         treeRootBaseComponent
      ],
      lights: []
   };
}