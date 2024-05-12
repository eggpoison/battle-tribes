import { ServerComponentType, YetiComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";

class YetiComponent extends ServerComponent<ServerComponentType.yeti> {
   public pawRenderParts = new Array<RenderPart>();
   
   public lastAttackProgress: number;
   public attackProgress: number;

   constructor(entity: Entity, data: YetiComponentData) {
      super(entity);

      this.lastAttackProgress = data.attackProgress;
      this.attackProgress = data.attackProgress;
   }

   public updateFromData(data: YetiComponentData): void {
      this.attackProgress = data.attackProgress;
   }
}

export default YetiComponent;