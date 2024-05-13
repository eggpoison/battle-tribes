import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { TreeComponentData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { HealthComponentArray, TreeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";

const TREE_MAX_HEALTHS = [10, 15];
export const TREE_RADII: ReadonlyArray<number> = [40, 50];
const SEED_DROP_CHANCES: ReadonlyArray<number> = [0.25, 0.5];

const WOOD_DROP_AMOUNTS: ReadonlyArray<[number, number]> = [
   [2, 4],
   [5, 7]
];

export function createTree(position: Point, rotation: number): Entity {
   const size = Math.random() > 1/3 ? 1 : 0;

   const tree = new Entity(position, rotation, EntityType.tree, COLLISION_BITS.plants, DEFAULT_COLLISION_MASK);

   const mass = 1.25 + size * 0.25;
   const hitbox = new CircularHitbox(tree.position.x, tree.position.y, mass, 0, 0, HitboxCollisionType.soft, TREE_RADII[size], tree.getNextHitboxLocalID(), tree.rotation);
   tree.addHitbox(hitbox);

   HealthComponentArray.addComponent(tree.id, new HealthComponent(TREE_MAX_HEALTHS[size]));
   StatusEffectComponentArray.addComponent(tree.id, new StatusEffectComponent(0));
   TreeComponentArray.addComponent(tree.id, {
      treeSize: size
   });

   return tree;
}

export function onTreeDeath(tree: Entity): void {
   const treeComponent = TreeComponentArray.getComponent(tree.id);

   createItemsOverEntity(tree, ItemType.wood, randInt(...WOOD_DROP_AMOUNTS[treeComponent.treeSize]), TREE_RADII[treeComponent.treeSize]);

   const dropChance = SEED_DROP_CHANCES[treeComponent.treeSize];
   if (Math.random() < dropChance) {
      createItemsOverEntity(tree, ItemType.seed, 1, TREE_RADII[treeComponent.treeSize])
   }
}

export function serialiseTreeComponent(tree: Entity): TreeComponentData {
   const treeComponent = TreeComponentArray.getComponent(tree.id);
   return {
      treeSize: treeComponent.treeSize
   };
}