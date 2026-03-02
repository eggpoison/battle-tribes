import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { ComponentArray } from "./ComponentArray";

export class GlurbSegmentComponent {
   public mossBallCompleteness = 0;
}

export const GlurbSegmentComponentArray = new ComponentArray<GlurbSegmentComponent>(ServerComponentType.glurbSegment, true, getDataLength, addDataToPacket);
GlurbSegmentComponentArray.onTakeDamage = onTakeDamage;

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const glurbSegmentComponent = GlurbSegmentComponentArray.getComponent(entity);
   packet.writeNumber(glurbSegmentComponent.mossBallCompleteness);
}

function onTakeDamage(entity: Entity): void {
   // @INCOMPLETE: No longer works since I removed the thing which triggers parent onTakeDamage callbacks when the child takes damage.
   // const tamingComponent = TamingComponentArray.getComponent(entity);
   // addSkillLearningProgress(tamingComponent, TamingSkillID.dulledPainReceptors, 1);
}