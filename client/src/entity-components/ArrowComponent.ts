import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { ArrowComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { GenericArrowType } from "webgl-test-shared/dist/entities";

class ArrowComponent extends ServerComponent<ServerComponentType.arrow> {
   public readonly arrowType: GenericArrowType;

   constructor(entity: Entity, data: ArrowComponentData) {
      super(entity);

      this.arrowType = data.arrowType;
   }

   public updateFromData(_data: ArrowComponentData): void {}
}

export default ArrowComponent;