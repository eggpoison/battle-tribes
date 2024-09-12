import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

export interface WanderAIComponentParams {}

export class WanderAIComponent {
   /** If set to -1, the wander AI has no current target position */
   targetPositionX = -1;
   targetPositionY = -1;
}

export const WanderAIComponentArray = new ComponentArray<WanderAIComponent>(ServerComponentType.wanderAI, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const wanderAIComponent = WanderAIComponentArray.getComponent(entity);

   packet.addNumber(wanderAIComponent.targetPositionX);
   packet.addNumber(wanderAIComponent.targetPositionY);
}