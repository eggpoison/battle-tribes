import { AIHelperComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class AIHelperComponent extends ServerComponent<ServerComponentType.aiHelper> {
   constructor(entity: Entity, _data: AIHelperComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: AIHelperComponentData): void {}
}

export default AIHelperComponent;