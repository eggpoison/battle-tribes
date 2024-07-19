import { ScarInfo, ServerComponentType, TribeWarriorComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class TribeWarriorComponent extends ServerComponent<ServerComponentType.tribeWarrior> {
   public readonly scars: ReadonlyArray<ScarInfo>;
   
   constructor(entity: Entity, data: TribeWarriorComponentData) {
      super(entity);

      this.scars = data.scars;
   }
   
   public updateFromData(_data: TribeWarriorComponentData): void {}
}

export default TribeWarriorComponent;