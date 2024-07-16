import { ResearchBenchComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { customTickIntervalHasPassed } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createPaperParticle } from "../particles";
import { getRandomPointInEntity } from "./TransformComponent";

class ResearchBenchComponent extends ServerComponent<ServerComponentType.researchBench> {
   public isOccupied: boolean;

   constructor(entity: Entity, data: ResearchBenchComponentData) {
      super(entity);
      
      this.isOccupied = data.isOccupied;
   }

   public tick(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      if (this.isOccupied && customTickIntervalHasPassed(transformComponent.ageTicks, 0.3)) {
         const pos = getRandomPointInEntity(transformComponent);
         createPaperParticle(pos.x, pos.y);
      }
   }

   public updateFromData(data: ResearchBenchComponentData): void {
      this.isOccupied = data.isOccupied;
   }
}

export default ResearchBenchComponent;