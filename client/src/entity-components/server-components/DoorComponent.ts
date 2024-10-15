import { ServerComponentType } from "battletribes-shared/components";
import { DoorToggleType, EntityID } from "battletribes-shared/entities";
import ServerComponent from "../ServerComponent";
import { playSound } from "../../sound";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";

class DoorComponent extends ServerComponent {
   public toggleType = DoorToggleType.close;
   public openProgress = 0;
}

export default DoorComponent;

export const DoorComponentArray = new ServerComponentArray<DoorComponent>(ServerComponentType.door, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const toggleType = reader.readNumber();
   const openProgress = reader.readNumber();
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const doorComponent = DoorComponentArray.getComponent(entity);

   if (toggleType === DoorToggleType.open && doorComponent.toggleType === DoorToggleType.none) {
      playSound("door-open.mp3", 0.4, 1, transformComponent.position);
   } else if (toggleType === DoorToggleType.close && doorComponent.toggleType === DoorToggleType.none) {
      playSound("door-close.mp3", 0.4, 1, transformComponent.position);
   }

   doorComponent.toggleType = toggleType;
   doorComponent.openProgress = openProgress;
}