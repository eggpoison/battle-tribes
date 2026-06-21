import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { SpruceTreeComponent, SpruceTreeComponentArray } from "../../components/SpruceTreeComponent.js";
import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity, TreeSize } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { randInt } from "../../../../shared/dist/utils.js";

const TREE_MAX_HEALTHS = [15, 20];

registerEntityLootOnDeath(EntityType.spruceTree, {
   itemType: ItemType.wood,
   getAmount: (tree: Entity) => {
      const spruceTreeComponent = SpruceTreeComponentArray.getComponent(tree);
      switch (spruceTreeComponent.treeSize) {
         case TreeSize.small: return randInt(2, 4);
         case TreeSize.large: return randInt(5, 7);
      }
   }
});

const TREE_RADII: readonly number[] = [46, 64];

export function createSpruceTreeConfig(x: number, y: number, angle: number): EntityConfig {
   const size: TreeSize = randInt(0, 1);
   
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, TREE_RADII[size]), 1.25 + size * 0.25, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(TREE_MAX_HEALTHS[size]);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const lootComponent = new LootComponent();
   
   const spruceTreeComponent = new SpruceTreeComponent(size);
   
   return {
      entityType: EntityType.spruceTree,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         spruceTreeComponent
      ],
      lights: []
   };
}