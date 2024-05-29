import { ServerComponentType, SlimewispComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class SlimewispComponent extends ServerComponent<ServerComponentType.slimewisp> {
   constructor(entity: Entity, _data: SlimewispComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: SlimewispComponentData): void {}
}

export default SlimewispComponent;