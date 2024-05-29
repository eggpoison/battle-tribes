import { ServerComponentType, YetiComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { lerp } from "webgl-test-shared/dist/utils";

export const YETI_SIZE = 128;

const YETI_PAW_START_ANGLE = Math.PI/3;
const YETI_PAW_END_ANGLE = Math.PI/6;

class YetiComponent extends ServerComponent<ServerComponentType.yeti> {
   public pawRenderParts: ReadonlyArray<RenderPart>;
   
   public lastAttackProgress: number;
   public attackProgress: number;

   constructor(entity: Entity, data: YetiComponentData) {
      super(entity);

      this.lastAttackProgress = data.attackProgress;
      this.attackProgress = data.attackProgress;

      this.pawRenderParts = this.entity.getRenderParts("yetiComponent:paw", 2);
      this.updatePaws();
   }
   
   private updatePaws(): void {
      let attackProgress = this.attackProgress;
      attackProgress = Math.pow(attackProgress, 0.75);
      
      for (let i = 0; i < 2; i++) {
         const paw = this.pawRenderParts[i];

         const angle = lerp(YETI_PAW_END_ANGLE, YETI_PAW_START_ANGLE, attackProgress) * (i === 0 ? 1 : -1);
         paw.offset.x = YETI_SIZE/2 * Math.sin(angle);
         paw.offset.y = YETI_SIZE/2 * Math.cos(angle);
      }
   }

   public updateFromData(data: YetiComponentData): void {
      this.attackProgress = data.attackProgress;
      this.updatePaws();
   }
}

export default YetiComponent;