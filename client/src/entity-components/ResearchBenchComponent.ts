import { customTickIntervalHasPassed } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createPaperParticle } from "../particles";
import { getRandomPointInEntity } from "./TransformComponent";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class ResearchBenchComponent extends ServerComponent {
   public isOccupied: boolean;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);
      
      this.isOccupied = reader.readBoolean();
      reader.padOffset(3);
   }

   public tick(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      if (this.isOccupied && customTickIntervalHasPassed(transformComponent.ageTicks, 0.3)) {
         const pos = getRandomPointInEntity(transformComponent);
         createPaperParticle(pos.x, pos.y);
      }
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.isOccupied = reader.readBoolean();
      reader.padOffset(3);
   }
}

export default ResearchBenchComponent;