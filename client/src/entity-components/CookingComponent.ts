import { CookingComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Point, randFloat } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Board from "../Board";
import Entity from "../Entity";
import { Light, addLight, attachLightToEntity } from "../lights";

class CookingComponent extends ServerComponent<ServerComponentType.cooking> {
   public heatingProgress: number;
   public isCooking: boolean;

   private readonly light: Light;

   constructor(entity: Entity, data: CookingComponentData) {
      super(entity);

      this.heatingProgress = data.heatingProgress;
      this.isCooking = data.isCooking;

      this.light = {
         offset: new Point(0, 0),
         intensity: 1,
         strength: 3.5,
         radius: 40,
         r: 0,
         g: 0,
         b: 0
      };
      const lightID = addLight(this.light);
      attachLightToEntity(lightID, this.entity.id);
   }

   public tick(): void {
      if (Board.tickIntervalHasPassed(0.15)) {
         this.light.radius = 40 + randFloat(-7, 7);
      }
   }
   
   public updateFromData(data: CookingComponentData): void {
      this.heatingProgress = data.heatingProgress;
      this.isCooking = data.isCooking;
   }
}

export default CookingComponent;