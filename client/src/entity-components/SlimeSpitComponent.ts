import { ServerComponentType, SlimeSpitComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class SlimeSpitComponent extends ServerComponent<ServerComponentType.slimeSpit> {
   constructor(entity: Entity, _data: SlimeSpitComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: SlimeSpitComponentData): void {}
}

export default SlimeSpitComponent;