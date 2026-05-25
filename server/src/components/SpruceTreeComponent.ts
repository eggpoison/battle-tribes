import { Entity, TreeSize, ServerComponentType, Packet, randInt, createCircularBox } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { getEntityLayer } from "../world.js";
import { createGrassBlocker } from "../grass-blockers.js";

const TREE_TRUNK_RADII: Record<TreeSize, number> = {
   [TreeSize.small]: 15,
   [TreeSize.large]: 22
};

export class SpruceTreeComponent {
   public readonly treeSize: TreeSize;
   public readonly snowVariant = Math.random() < 0.6 ? randInt(1, 2) : 0;

   constructor(size: number) {
      this.treeSize = size;
   }
}

export const SpruceTreeComponentArray = new ComponentArray<SpruceTreeComponent>(ServerComponentType.spruceTree, true, getDataLength, addDataToPacket);
SpruceTreeComponentArray.onJoin = onJoin;

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const treeHitbox = transformComponent.hitboxes[0];
   
   const spruceTreeComponent = SpruceTreeComponentArray.getComponent(entity);

   const blockerBox = createCircularBox(treeHitbox.box.posX, treeHitbox.box.posY, 0, 0, 0, TREE_TRUNK_RADII[spruceTreeComponent.treeSize]);
   createGrassBlocker(blockerBox, getEntityLayer(entity), 0, 0.9, entity)
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const spruceTreeComponent = SpruceTreeComponentArray.getComponent(entity);
   packet.writeNumber(spruceTreeComponent.treeSize);
   packet.writeNumber(spruceTreeComponent.snowVariant);
}