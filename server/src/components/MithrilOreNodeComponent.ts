import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { destroyEntity, entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";

export class MithrilOreNodeComponent {
   public readonly size: number;
   public readonly variant: number;
   public readonly children: ReadonlyArray<Entity>;
   /** To allow children to be rendered below their parents */
   public readonly renderHeight: number;

   constructor(size: number, variant: number, children: ReadonlyArray<Entity>, renderHeight: number) {
      this.size = size;
      this.variant = variant;
      this.children = children;
      this.renderHeight = renderHeight;
   }
}

export const MithrilOreNodeComponentArray = new ComponentArray<MithrilOreNodeComponent>(ServerComponentType.mithrilOreNode, true, getDataLength, addDataToPacket);
MithrilOreNodeComponentArray.preRemove = preRemove;

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
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