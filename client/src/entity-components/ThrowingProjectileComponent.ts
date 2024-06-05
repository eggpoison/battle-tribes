import { ServerComponentType, ThrowingProjectileComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class ThrowingProjectileComponent extends ServerComponent<ServerComponentType.throwingProjectile> {
   constructor(entity: Entity, _data: ThrowingProjectileComponentData) {
      super(entity);
   }
   
   public updateFromData(_data: ThrowingProjectileComponentData): void {}
}

export default ThrowingProjectileComponent;