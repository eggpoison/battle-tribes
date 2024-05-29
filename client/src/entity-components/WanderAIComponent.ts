import { ServerComponentType, WanderAIComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class WanderAIComponent extends ServerComponent<ServerComponentType.wanderAI> {
   constructor(entity: Entity, _data: WanderAIComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: WanderAIComponentData): void {}
}

export default WanderAIComponent;