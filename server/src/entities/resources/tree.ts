import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { Entity, EntityType, TreeSize } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { TreeComponent, TreeComponentArray } from "../../components/TreeComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { Hitbox } from "../../hitboxes";

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

export function createTreeConfig(position: Point, angle: number, size: TreeSize): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, TREE_RADII[size]), 1.25 + size * 0.25, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
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