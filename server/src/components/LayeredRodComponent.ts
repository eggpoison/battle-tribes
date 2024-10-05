import { Colour, Point, randFloat } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

export class LayeredRodComponent {
   public readonly numLayers: number;
   // @Memory: Can be removed and just use a hash on the entity ID
   public readonly naturalBend = Point.fromVectorForm(randFloat(2, 4), 2 * Math.PI * Math.random());

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

export const LayeredRodComponentArray = new ComponentArray<LayeredRodComponent>(ServerComponentType.layeredRod, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 7 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const layeredRodComponent = LayeredRodComponentArray.getComponent(entity);
   
   // Num layers
   packet.addNumber(layeredRodComponent.numLayers);
   // NaturalBendX
   packet.addNumber(layeredRodComponent.naturalBend.x);
   // NaturalBendY
   packet.addNumber(layeredRodComponent.naturalBend.y);
   // Colour R
   packet.addNumber(layeredRodComponent.r);
   // Colour G
   packet.addNumber(layeredRodComponent.g);
   // Colour B
   packet.addNumber(layeredRodComponent.b);
}