import { EscapeAIComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class EscapeAIComponent extends ServerComponent<ServerComponentType.escapeAI> {
   constructor(entity: Entity, _data: EscapeAIComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: EscapeAIComponentData): void {}
}

export default EscapeAIComponent;