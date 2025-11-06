import { Entity, TreeSize } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { getEntityLayer } from "../world";
import { createGrassBlocker } from "../grass-blockers";
import { CircularBox } from "../../../shared/src/boxes/CircularBox";
import { Point } from "../../../shared/src/utils";

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

   const blockerBox = new CircularBox(treeHitbox.box.position.copy(), new Point(0, 0), 0, TREE_TRUNK_RADII[treeComponent.treeSize]);
   createGrassBlocker(blockerBox, getEntityLayer(entity), 0, 0.9, entity)
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const treeComponent = TreeComponentArray.getComponent(entity);
   packet.writeNumber(treeComponent.treeSize);
}