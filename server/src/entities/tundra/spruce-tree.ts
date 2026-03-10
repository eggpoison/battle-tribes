import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { Entity, EntityType, TreeSize } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { Hitbox } from "../../hitboxes";
import { SpruceTreeComponent, SpruceTreeComponentArray } from "../../components/SpruceTreeComponent";

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

const TREE_RADII: ReadonlyArray<number> = [46, 64];

export function createSpruceTreeConfig(position: Point, angle: number): EntityConfig {
   const size: TreeSize = randInt(0, 1);
   
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, TREE_RADII[size]), 1.25 + size * 0.25, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
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