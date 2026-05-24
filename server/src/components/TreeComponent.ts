import { Entity, TreeSize, ServerComponentType, Packet, CircularBox, Point } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";

const TREE_TRUNK_RADII: Record<TreeSize, number> = {
   [TreeSize.small]: 15,
   [TreeSize.large]: 22
};

export class TreeComponent {
   readonly treeSize: TreeSize;

   constructor(size: number) {
      this.treeSize = size;
   }
}

export const TreeComponentArray = new ComponentArray<TreeComponent>(ServerComponentType.tree, true, getDataLength, addDataToPacket);
TreeComponentArray.onJoin = onJoin;

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const treeHitbox = transformComponent.hitboxes[0];
   
   const treeComponent = TreeComponentArray.getComponent(entity);

   const blockerBox = new CircularBox(treeHitbox.box.posX, treeHitbox.box.posX, 0, 0, 0, TREE_TRUNK_RADII[treeComponent.treeSize]);
   // @SQUEAM for shot
   // createGrassBlocker(blockerBox, getEntityLayer(entity), 0, 0.9, entity)
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const treeComponent = TreeComponentArray.getComponent(entity);
   packet.writeNumber(treeComponent.treeSize);
}