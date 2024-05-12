import { ResearchBenchComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { customTickIntervalHasPassed, randFloat, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import ResearchBench from "../entities/ResearchBench";
import { createPaperParticle } from "../particles";

class ResearchBenchComponent extends ServerComponent<ServerComponentType.researchBench> {
   public isOccupied: boolean;

   constructor(entity: Entity, data: ResearchBenchComponentData) {
      super(entity);
      
      this.isOccupied = data.isOccupied;
   }

   public tick(): void {
      if (this.isOccupied && customTickIntervalHasPassed(this.entity.ageTicks, 0.3)) {
         const offsetX = randFloat(-ResearchBench.WIDTH * 0.5, ResearchBench.WIDTH * 0.5) * 0.8;
         const offsetY = randFloat(-ResearchBench.HEIGHT * 0.5, ResearchBench.HEIGHT * 0.5) * 0.8;

         const x = this.entity.position.x + rotateXAroundOrigin(offsetX, offsetY, this.entity.rotation);
         const y = this.entity.position.y + rotateYAroundOrigin(offsetX, offsetY, this.entity.rotation);
         createPaperParticle(x, y);
      }
   }

   public updateFromData(data: ResearchBenchComponentData): void {
      this.isOccupied = data.isOccupied;
   }
}

export default ResearchBenchComponent;