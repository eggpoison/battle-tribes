import { EntityID, TreeSize } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";
import { GrassBlockerCircle } from "webgl-test-shared/dist/grass-blockers";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../components";
import { TransformComponentArray } from "./TransformComponent";
import { addGrassBlocker } from "../grass-blockers";
import { Packet } from "webgl-test-shared/dist/packets";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { randInt } from "webgl-test-shared/dist/utils";
import { createItemsOverEntity } from "../entity-shared";
import CircularBox from "webgl-test-shared/dist/boxes/CircularBox";

export interface TreeComponentParams {
   readonly treeSize: TreeSize;
}

export const TREE_RADII: ReadonlyArray<number> = [40, 50];
const TREE_MAX_HEALTHS = [10, 15];

const SEED_DROP_CHANCES: ReadonlyArray<number> = [0.25, 0.5];

const WOOD_DROP_AMOUNTS: ReadonlyArray<[number, number]> = [
   [2, 4],
   [5, 7]
];

const TREE_TRUNK_RADII: Record<TreeSize, number> = {
   [TreeSize.small]: 15,
   [TreeSize.large]: 22
};

export class TreeComponent {
   readonly treeSize: TreeSize;

   constructor(params: TreeComponentParams) {
      this.treeSize = params.treeSize;
   }
}

export const TreeComponentArray = new ComponentArray<TreeComponent>(ServerComponentType.tree, true, {
   onInitialise: onInitialise,
   onJoin: onJoin,
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onInitialise(config: ComponentConfig<ServerComponentType.transform | ServerComponentType.health | ServerComponentType.tree>): void {
   const treeSize = config[ServerComponentType.tree].treeSize;

   config[ServerComponentType.health].maxHealth = TREE_MAX_HEALTHS[treeSize];

   const hitbox = config[ServerComponentType.transform].hitboxes[0];
   const box = hitbox.box as CircularBox;
   
   hitbox.mass = 1.25 + treeSize * 0.25;
   box.radius = TREE_RADII[treeSize];
}

function onJoin(entity: EntityID): void {
   const treeComponent = TreeComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const blocker: GrassBlockerCircle = {
      position: transformComponent.position.copy(),
      blockAmount: 0,
      radius: TREE_TRUNK_RADII[treeComponent.treeSize],
      maxBlockAmount: 0.9
   };
   addGrassBlocker(blocker, entity);
}

function onRemove(tree: EntityID): void {
   const treeComponent = TreeComponentArray.getComponent(tree);

   createItemsOverEntity(tree, ItemType.wood, randInt(...WOOD_DROP_AMOUNTS[treeComponent.treeSize]), TREE_RADII[treeComponent.treeSize]);

   const dropChance = SEED_DROP_CHANCES[treeComponent.treeSize];
   if (Math.random() < dropChance) {
      createItemsOverEntity(tree, ItemType.seed, 1, TREE_RADII[treeComponent.treeSize])
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const treeComponent = TreeComponentArray.getComponent(entity);
   packet.addNumber(treeComponent.treeSize);
}