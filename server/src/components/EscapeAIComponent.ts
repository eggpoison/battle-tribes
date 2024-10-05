import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

// @Incomplete: Remove this component

export class EscapeAIComponent {
   /** IDs of all entities attacking the entity */
   public readonly attackingEntities = new Array<number>();
   public readonly attackEntityTicksSinceLastAttack = new Array<number>();
}

export const EscapeAIComponentArray = new ComponentArray<EscapeAIComponent>(ServerComponentType.escapeAI, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

export function updateEscapeAIComponent(escapeAIComponent: EscapeAIComponent, attackSubsideTicks: number): void {
   for (let i = 0; i < escapeAIComponent.attackingEntities.length; i++) {
      if (escapeAIComponent.attackEntityTicksSinceLastAttack[i]++ >= attackSubsideTicks) {
         escapeAIComponent.attackingEntities.splice(i, 1);
         escapeAIComponent.attackEntityTicksSinceLastAttack.splice(i, 1);
         i--;
      }
   }
}

function getDataLength(entity: EntityID): number {
   const escapeAIComponent = EscapeAIComponentArray.getComponent(entity);

   let lengthBytes = 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT * escapeAIComponent.attackingEntities.length;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT * escapeAIComponent.attackEntityTicksSinceLastAttack.length;

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const escapeAIComponent = EscapeAIComponentArray.getComponent(entity);

   packet.addNumber(escapeAIComponent.attackingEntities.length);
   for (let i = 0; i < escapeAIComponent.attackingEntities.length; i++) {
      const entity = escapeAIComponent.attackingEntities[i];
      packet.addNumber(entity);
   }

   for (let i = 0; i < escapeAIComponent.attackingEntities.length; i++) {
      const ticks = escapeAIComponent.attackEntityTicksSinceLastAttack[i];
      packet.addNumber(ticks);
   }
}