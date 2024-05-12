import { FishComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class FishComponent extends ServerComponent<ServerComponentType.fish> {
   public readonly waterOpacityMultiplier: number;
   
   constructor(entity: Entity, waterOpacityMultiplier: number) {
      super(entity);

      this.waterOpacityMultiplier = waterOpacityMultiplier;
   }

   public updateFromData(_data: FishComponentData): void {}
}

export default FishComponent;