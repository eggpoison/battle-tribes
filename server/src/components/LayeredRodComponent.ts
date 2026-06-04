import { ServerComponentType } from "../../../shared/dist/components.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { polarVec2, randFloat, randAngle, Colour } from "../../../shared/dist/utils.js";
import { ComponentArray } from "./ComponentArray.js";

export class LayeredRodComponent {
   public readonly numLayers: number;
   // @Memory: Can be removed and just use a hash on the entity ID
   public readonly naturalBend = polarVec2(randFloat(2, 4), randAngle());

   // @Memory: Can be removed and just use a hash on the entity ID
   public readonly r: number;
   public readonly g: number;
   public readonly b: number;
   
   constructor(numLayers: number, colour: Colour) {
      this.numLayers = numLayers;
      this.r = colour.r;
      this.g = colour.g;
      this.b = colour.b;
   }
}

export const LayeredRodComponentArray = new ComponentArray<LayeredRodComponent>(ServerComponentType.layeredRod, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 6 * Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const layeredRodComponent = LayeredRodComponentArray.getComponent(entity);
   
   // Num layers
   packet.writeNumber(layeredRodComponent.numLayers);
   // NaturalBendX
   packet.writeNumber(layeredRodComponent.naturalBend.x);
   // NaturalBendY
   packet.writeNumber(layeredRodComponent.naturalBend.y);
   // Colour R
   packet.writeNumber(layeredRodComponent.r);
   // Colour G
   packet.writeNumber(layeredRodComponent.g);
   // Colour B
   packet.writeNumber(layeredRodComponent.b);
}