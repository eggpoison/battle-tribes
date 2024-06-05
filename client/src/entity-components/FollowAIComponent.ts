import { FollowAIComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class FollowAIComponent extends ServerComponent<ServerComponentType.followAI> {
   constructor(entity: Entity, _data: FollowAIComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: FollowAIComponentData): void {}
}

export default FollowAIComponent;