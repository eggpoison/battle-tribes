import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { customTickIntervalHasPassed } from "../../../../shared/src/utils";
import { createPaperParticle } from "../../particles";
import { getEntityAgeTicks } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray, getRandomPointInEntity } from "./TransformComponent";

class ResearchBenchComponent {
   public isOccupied = false;
}

export default ResearchBenchComponent;

export const ResearchBenchComponentArray = new ServerComponentArray<ResearchBenchComponent>(ServerComponentType.researchBench, true, {
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function onTick(researchBenchComponent: ResearchBenchComponent, entity: EntityID): void {
   if (researchBenchComponent.isOccupied && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.3)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const pos = getRandomPointInEntity(transformComponent);
      createPaperParticle(pos.x, pos.y);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(entity);
   researchBenchComponent.isOccupied = reader.readBoolean();
   reader.padOffset(3);
}