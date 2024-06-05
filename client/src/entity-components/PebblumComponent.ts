import { PebblumComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class PebblumComponent extends ServerComponent<ServerComponentType.pebblum> {
   constructor(entity: Entity, _data: PebblumComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: PebblumComponentData): void {}
}

export default PebblumComponent;