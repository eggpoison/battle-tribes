import { BoulderComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class BoulderComponent extends ServerComponent<ServerComponentType.boulder> {
   constructor(entity: Entity, _data: BoulderComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: BoulderComponentData): void {}
}

export default BoulderComponent;