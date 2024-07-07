import { TreeSize } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";
import { GrassBlockerCircle } from "webgl-test-shared/dist/grass-blockers";
import Board from "../Board";
import { ServerComponentType, TreeComponentData } from "webgl-test-shared/dist/components";

export interface TreeComponentParams {
   readonly treeSize: TreeSize;
}

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

export const TreeComponentArray = new ComponentArray<ServerComponentType.tree, TreeComponent>(true, {
   onJoin: onJoin,
   serialise: serialise
});

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
   // @Temporary
   // addGrassBlocker(blocker, entityID);
}

function serialise(entityID: number): TreeComponentData {
   const treeComponent = TreeComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.tree,
      treeSize: treeComponent.treeSize
   };
}