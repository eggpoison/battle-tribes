import { Bytes } from "../../../shared/dist/constants.js";
import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { destroyEntity, entityExists } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";

export class MithrilOreNodeComponent {
   public readonly size: number;
   public readonly variant: number;
   public readonly children: readonly Entity[];
   /** To allow children to be rendered below their parents */
   public readonly renderHeight: number;

   constructor(size: number, variant: number, children: readonly Entity[], renderHeight: number) {
      this.size = size;
      this.variant = variant;
      this.children = children;
      this.renderHeight = renderHeight;
   }
}

export const MithrilOreNodeComponentArray = new ComponentArray<MithrilOreNodeComponent>(ServerComponentType.mithrilOreNode, true, getDataLength, addDataToPacket);
MithrilOreNodeComponentArray.preRemove = preRemove;

function getDataLength(): number {
   return 3 * Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const mithrilOreNodeComponent = MithrilOreNodeComponentArray.getComponent(entity);
   packet.writeNumber(mithrilOreNodeComponent.size);
   packet.writeNumber(mithrilOreNodeComponent.variant);
   packet.writeNumber(mithrilOreNodeComponent.renderHeight);
}

function preRemove(entity: Entity): void {
   const mithrilOreNodeComponent = MithrilOreNodeComponentArray.getComponent(entity);
   for (const child of mithrilOreNodeComponent.children) {
      if (entityExists(child)) {
         destroyEntity(child);
      }
   }
}