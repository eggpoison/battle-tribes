import { ServerComponentType, SnowballComponentData } from "webgl-test-shared/dist/components";
import { SnowballSize } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class SnowballComponent extends ServerComponent<ServerComponentType.snowball> {
   public readonly size: SnowballSize;
   
   constructor(entity: Entity, data: SnowballComponentData) {
      super(entity);

      this.size = data.size;
   }
   
   public updateFromData(_data: SnowballComponentData): void {}
}

export default SnowballComponent;