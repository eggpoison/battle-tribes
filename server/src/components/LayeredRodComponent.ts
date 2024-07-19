import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";

export interface LayeredRodComponentParams {}

export class LayeredRodComponent {
   public readonly numLayers = randInt(2, 5);
   public readonly naturalBend = Point.fromVectorForm(randFloat(2, 4), 2 * Math.PI * Math.random());
   public readonly colour = {
      r: randFloat(0.4, 0.5),
      g: randFloat(0.83, 0.95),
      b: randFloat(0.2, 0.3)
   };
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
   packet.addNumber(layeredRodComponent.colour.r);
   // Colour G
   packet.addNumber(layeredRodComponent.colour.g);
   // Colour B
   packet.addNumber(layeredRodComponent.colour.b);
}