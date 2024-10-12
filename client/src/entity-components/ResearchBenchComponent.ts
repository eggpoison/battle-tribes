import { customTickIntervalHasPassed } from "battletribes-shared/utils";
import ServerComponent from "./ServerComponent";
import { createPaperParticle } from "../particles";
import { getRandomPointInEntity, TransformComponentArray } from "./TransformComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { EntityID } from "../../../shared/src/entities";

class ResearchBenchComponent extends ServerComponent {
   public isOccupied = false;

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.isOccupied = reader.readBoolean();
      reader.padOffset(3);
   }
}

export default ResearchBenchComponent;

export const ResearchBenchComponentArray = new ComponentArray<ResearchBenchComponent>(ComponentArrayType.server, ServerComponentType.researchBench, true, {
   onTick: onTick
});

function onTick(researchBenchComponent: ResearchBenchComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (researchBenchComponent.isOccupied && customTickIntervalHasPassed(transformComponent.ageTicks, 0.3)) {
      const pos = getRandomPointInEntity(transformComponent);
      createPaperParticle(pos.x, pos.y);
   }
}