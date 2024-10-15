import ServerComponent from "../ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

class FollowAIComponent extends ServerComponent {}

export default FollowAIComponent;

export const FollowAIComponentArray = new ServerComponentArray<FollowAIComponent>(ServerComponentType.followAI, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}