import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityID } from "../../../../shared/src/entities";

class PlayerComponent {
   public username = "";
}

export default PlayerComponent;

export const PlayerComponentArray = new ServerComponentArray<PlayerComponent>(ServerComponentType.player, true, {
   padData: padData,
   updateFromData: updateFromData
});
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT + 100);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const playerComponent = PlayerComponentArray.getComponent(entity);
   
   playerComponent.username = reader.readString(100);
}