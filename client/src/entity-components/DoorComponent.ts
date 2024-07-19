import { ServerComponentType } from "webgl-test-shared/dist/components";
import { DoorToggleType } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { playSound } from "../sound";
import { PacketReader } from "webgl-test-shared/dist/packets";

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