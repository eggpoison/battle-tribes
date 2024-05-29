import { IceSpikesComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class IceSpikesComponent extends ServerComponent<ServerComponentType.iceSpikes> {
   constructor(entity: Entity, _data: IceSpikesComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: IceSpikesComponentData): void {}
}

export default IceSpikesComponent;