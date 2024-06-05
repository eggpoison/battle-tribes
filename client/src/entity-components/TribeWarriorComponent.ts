import { ServerComponentType, TribeWarriorComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class TribeWarriorComponent extends ServerComponent<ServerComponentType.tribeWarrior> {
   constructor(entity: Entity, _data: TribeWarriorComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: TribeWarriorComponentData): void {}
}

export default TribeWarriorComponent;