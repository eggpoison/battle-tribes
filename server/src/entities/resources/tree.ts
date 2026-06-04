import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { TreeComponent, TreeComponentArray } from "../../components/TreeComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity, TreeSize } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { randInt } from "../../../../shared/dist/utils.js";

const TREE_MAX_HEALTHS = [10, 15];

registerEntityLootOnDeath(EntityType.tree, {
   itemType: ItemType.wood,
   getAmount: (tree: Entity) => {
      const treeComponent = TreeComponentArray.getComponent(tree);
      switch (treeComponent.treeSize) {
         case TreeSize.small: return randInt(2, 4);
         case TreeSize.large: return randInt(5, 7);
      }
   }
});
registerEntityLootOnDeath(EntityType.tree, {
   itemType: ItemType.seed,
   getAmount: (tree: Entity) => {
      const treeComponent = TreeComponentArray.getComponent(tree);

      let dropChance: number;
      switch (treeComponent.treeSize) {
         case TreeSize.small: dropChance = 0.25; break;
         case TreeSize.large: dropChance = 0.5; break;
      }

      return Math.random() < dropChance ? 1 : 0;
   }
});

const TREE_RADII: ReadonlyArray<number> = [40, 50];

export function createTreeConfig(x: number, y: number, angle: number, size: TreeSize): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, TREE_RADII[size]), 1.25 + size * 0.25, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(TREE_MAX_HEALTHS[size]);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const lootComponent = new LootComponent();
   
   const treeComponent = new TreeComponent(size);
   
   return {
      entityType: EntityType.tree,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         treeComponent
      ],
      lights: []
   };
}