import ServerComponent from "../ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

class AIHelperComponent extends ServerComponent {}

export default AIHelperComponent;

export const AIHelperComponentArray = new ServerComponentArray<AIHelperComponent>(ServerComponentType.aiHelper, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}