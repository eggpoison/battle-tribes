import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { createItemsOverEntity } from "../../entity-shared";
import { TREE_RADII, TreeComponentArray } from "../../components/TreeComponent";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tree;

const SEED_DROP_CHANCES: ReadonlyArray<number> = [0.25, 0.5];

const WOOD_DROP_AMOUNTS: ReadonlyArray<[number, number]> = [
   [2, 4],
   [5, 7]
];

export function createTreeConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.tree,
         collisionBit: COLLISION_BITS.plants,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(0, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 0)]
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.tree]: {
         treeSize: Math.random() > 1/3 ? 1 : 0
      }
   };
}

export function onTreeDeath(tree: EntityID): void {
   const treeComponent = TreeComponentArray.getComponent(tree);

   createItemsOverEntity(tree, ItemType.wood, randInt(...WOOD_DROP_AMOUNTS[treeComponent.treeSize]), TREE_RADII[treeComponent.treeSize]);

   const dropChance = SEED_DROP_CHANCES[treeComponent.treeSize];
   if (Math.random() < dropChance) {
      createItemsOverEntity(tree, ItemType.seed, 1, TREE_RADII[treeComponent.treeSize])
   }
}