import { FishComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { randFloat } from "webgl-test-shared/dist/utils";

class FishComponent extends ServerComponent<ServerComponentType.fish> {
   public readonly waterOpacityMultiplier: number;
   
   constructor(entity: Entity, _data: FishComponentData) {
      super(entity);

      this.waterOpacityMultiplier = randFloat(0.6, 1);
   }

   public updateFromData(_data: FishComponentData): void {}
}

export default FishComponent;