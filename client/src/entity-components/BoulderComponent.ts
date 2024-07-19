import { BoulderComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class BoulderComponent extends ServerComponent<ServerComponentType.boulder> {
   public readonly boulderType: number;
   
   constructor(entity: Entity, data: BoulderComponentData) {
      super(entity);

      this.boulderType = data.boulderType;
   }
   
   public updateFromData(_data: BoulderComponentData): void {}
}

export default BoulderComponent;