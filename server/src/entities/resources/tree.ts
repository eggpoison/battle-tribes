import { COLLISION_BITS, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType, TreeSize } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { TREE_RADII, TreeComponent } from "../../components/TreeComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tree;

const TREE_MAX_HEALTHS = [10, 15];

export function createTreeConfig(): EntityConfig<ComponentTypes> {
   const size: TreeSize = Math.random() > 1/3 ? 1 : 0;
   
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, TREE_RADII[size]), 1.25 + size * 0.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionBit = COLLISION_BITS.plants;
   
   const healthComponent = new HealthComponent(TREE_MAX_HEALTHS[size]);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const treeComponent = new TreeComponent(size);
   
   return {
      entityType: EntityType.tree,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tree]: treeComponent
      }
   };
}