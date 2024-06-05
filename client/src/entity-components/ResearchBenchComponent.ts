import { ResearchBenchComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { customTickIntervalHasPassed } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity, { getRandomPointInEntity } from "../Entity";
import { createPaperParticle } from "../particles";

class ResearchBenchComponent extends ServerComponent<ServerComponentType.researchBench> {
   public isOccupied: boolean;

   constructor(entity: Entity, data: ResearchBenchComponentData) {
      super(entity);
      
      this.isOccupied = data.isOccupied;
   }

   public tick(): void {
      if (this.isOccupied && customTickIntervalHasPassed(this.entity.ageTicks, 0.3)) {
         const pos = getRandomPointInEntity(this.entity);
         createPaperParticle(pos.x, pos.y);
      }
   }

   public updateFromData(data: ResearchBenchComponentData): void {
      this.isOccupied = data.isOccupied;
   }
}

export default ResearchBenchComponent;