import { ServerComponentType } from "battletribes-shared/components";
import { DoorToggleType } from "battletribes-shared/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { playSound } from "../sound";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class DoorComponent extends ServerComponent {
   public toggleType: DoorToggleType;
   public openProgress: number;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.toggleType = reader.readNumber();
      this.openProgress = reader.readNumber();
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      const toggleType = reader.readNumber();
      const openProgress = reader.readNumber();
      
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);

      if (toggleType === DoorToggleType.open && this.toggleType === DoorToggleType.none) {
         playSound("door-open.mp3", 0.4, 1, transformComponent.position);
      } else if (toggleType === DoorToggleType.close && this.toggleType === DoorToggleType.none) {
         playSound("door-close.mp3", 0.4, 1, transformComponent.position);
      }

      this.toggleType = toggleType;
      this.openProgress = openProgress;
   }
}

export default DoorComponent;

export const DoorComponentArray = new ComponentArray<DoorComponent>(ComponentArrayType.server, ServerComponentType.door, true, {});