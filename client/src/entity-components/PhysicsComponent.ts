import { PhysicsComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class PhysicsComponent extends ServerComponent<ServerComponentType.physics> {
   constructor(entity: Entity, _data: PhysicsComponentData) {
      super(entity);
   }

   public updateFromData(_data: PhysicsComponentData): void {}
}

export default PhysicsComponent;