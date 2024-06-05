import { IceShardComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class IceShardComponent extends ServerComponent<ServerComponentType.iceShard> {
   constructor(entity: Entity, _data: IceShardComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: IceShardComponentData): void {}
}

export default IceShardComponent;