import { ServerComponentType } from "../../../shared/dist/components.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { randInt, assert } from "../../../shared/dist/utils.js";
import { entityExists } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { TreeRootBaseComponentArray } from "./TreeRootBaseComponent.js";

export class TreeRootSegmentComponent {
   readonly root: Entity;
   public readonly variation = randInt(0, 3);

   constructor(root: Entity) {
      this.root = root;
   }
}

export const TreeRootSegmentComponentArray = new ComponentArray<TreeRootSegmentComponent>(ServerComponentType.treeRootSegment, true, getDataLength, addDataToPacket);
TreeRootSegmentComponentArray.onJoin = onJoin;
TreeRootSegmentComponentArray.onRemove = onRemove;

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);
   packet.writeNumber(treeRootSegmentComponent.variation);
}

function onJoin(entity: Entity): void {
   const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);

   const treeRootBaseComponent = TreeRootBaseComponentArray.getComponent(treeRootSegmentComponent.root);
   treeRootBaseComponent.segments.push(entity);
}

function onRemove(entity: Entity): void {
   const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);

   if (entityExists(treeRootSegmentComponent.root)) {
      const treeRootBaseComponent = TreeRootBaseComponentArray.getComponent(treeRootSegmentComponent.root);
      const idx = treeRootBaseComponent.segments.indexOf(entity);
      assert(idx !== -1);
      treeRootBaseComponent.segments.splice(idx, 1);
   }
}