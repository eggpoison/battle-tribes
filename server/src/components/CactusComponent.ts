import { CactusComponentData, ServerComponentType } from "battletribes-shared/components";
import { CactusBodyFlowerData, CactusLimbData, EntityID } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";

export interface CactusComponentParams {
   readonly flowers: ReadonlyArray<CactusBodyFlowerData>;
   readonly limbs: ReadonlyArray<CactusLimbData>;
}

export class CactusComponent {
   public readonly flowers: ReadonlyArray<CactusBodyFlowerData>;
   public readonly limbs: ReadonlyArray<CactusLimbData>;

   constructor(params: CactusComponentParams) {
      this.flowers = params.flowers;
      this.limbs = params.limbs;
   }
}

export const CactusComponentArray = new ComponentArray<CactusComponent>(ServerComponentType.cactus, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(entity: EntityID): number {
   const cactusComponent = CactusComponentArray.getComponent(entity);

   let lengthBytes = 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 5 * Float32Array.BYTES_PER_ELEMENT * cactusComponent.flowers.length;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const limb of cactusComponent.limbs) {
      if (typeof limb.flower !== "undefined") {
         lengthBytes += 6 * Float32Array.BYTES_PER_ELEMENT;
      } else {
         lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
      }
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const cactusComponent = CactusComponentArray.getComponent(entity);

   packet.addNumber(cactusComponent.flowers.length);
   for (let i = 0; i < cactusComponent.flowers.length; i++) {
      const flower = cactusComponent.flowers[i];
      packet.addNumber(flower.type);
      packet.addNumber(flower.height);
      packet.addNumber(flower.rotation);
      packet.addNumber(flower.size);
      packet.addNumber(flower.column);
   }

   packet.addNumber(cactusComponent.limbs.length);
   for (let i = 0; i < cactusComponent.limbs.length; i++) {
      const limbData = cactusComponent.limbs[i];
      packet.addNumber(limbData.direction);
      packet.addBoolean(typeof limbData.flower !== "undefined");
      packet.padOffset(3);
      if (typeof limbData.flower !== "undefined") {
         packet.addNumber(limbData.flower.type);
         packet.addNumber(limbData.flower.height);
         packet.addNumber(limbData.flower.rotation);
         packet.addNumber(limbData.flower.direction);
      }
   }
}