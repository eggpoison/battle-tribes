import { PlayerComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class PlayerComponent extends ServerComponent<ServerComponentType.player> {
   public readonly username: string;
   
   constructor(entity: Entity, data: PlayerComponentData) {
      super(entity);

      this.username = data.username;
   }
   
   public updateFromData(_data: PlayerComponentData): void {}
}

export default PlayerComponent;