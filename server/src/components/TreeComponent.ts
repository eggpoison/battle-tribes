import { TreeSize } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";
import { GrassBlockerCircle } from "webgl-test-shared/dist/grass-blockers";
import Board from "../Board";
import { addGrassBlocker } from "../grass-blockers";

const TREE_TRUNK_RADII: Record<TreeSize, number> = {
   [TreeSize.small]: 15,
   [TreeSize.large]: 22
};

export interface TreeComponent {
   readonly treeSize: TreeSize;
}

export const TreeComponentArray = new ComponentArray<TreeComponent>(true, onJoin);

function onJoin(entityID: number): void {
   const treeComponent = TreeComponentArray.getComponent(entityID);

   // @Hack
   const tree = Board.entityRecord[entityID]!;

   const blocker: GrassBlockerCircle = {
      position: tree.position.copy(),
      blockAmount: 0,
      radius: TREE_TRUNK_RADII[treeComponent.treeSize],
      maxBlockAmount: 0.9
   };
   addGrassBlocker(blocker, entityID);
}