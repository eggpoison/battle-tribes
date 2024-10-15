import ServerComponent from "../ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";

class EscapeAIComponent extends ServerComponent {}

export default EscapeAIComponent;

export const EscapeAIComponentArray = new ServerComponentArray<EscapeAIComponent>(ServerComponentType.escapeAI, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(reader: PacketReader): void {
   const numAttackingEntities = reader.readNumber();
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);
}

function updateFromData(reader: PacketReader): void {
   const numAttackingEntities = reader.readNumber();
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numAttackingEntities);
}