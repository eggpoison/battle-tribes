import { DoorComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { DoorToggleType } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { playSound } from "../sound";

class DoorComponent extends ServerComponent<ServerComponentType.door> {
   public toggleType: DoorToggleType;
   public openProgress: number;

   constructor(entity: Entity, data: DoorComponentData) {
      super(entity);

      this.toggleType = data.toggleType;
      this.openProgress = data.openProgress;
   }

   public updateFromData(data: DoorComponentData): void {
      const toggleType = data.toggleType;
      if (toggleType === DoorToggleType.open && this.toggleType === DoorToggleType.none) {
         playSound("door-open.mp3", 0.4, 1, this.entity.position.x, this.entity.position.y);
      } else if (toggleType === DoorToggleType.close && this.toggleType === DoorToggleType.none) {
         playSound("door-close.mp3", 0.4, 1, this.entity.position.x, this.entity.position.y);
      }
      this.toggleType = toggleType;

      this.openProgress = data.openProgress;
   }
}

export default DoorComponent;