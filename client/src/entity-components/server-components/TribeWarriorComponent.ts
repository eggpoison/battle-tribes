import { ScarInfo } from "battletribes-shared/components";
import ServerComponent from "../ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityID } from "../../../../shared/src/entities";

class TribeWarriorComponent extends ServerComponent {
   public readonly scars = new Array<ScarInfo>();
}

export default TribeWarriorComponent;

export const TribeWarriorComponentArray = new ServerComponentArray<TribeWarriorComponent>(ServerComponentType.tribeWarrior, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(reader: PacketReader): void {
   const numScars = reader.readNumber();
   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT * numScars);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entity);
   
   const numScars = reader.readNumber();
   for (let i = tribeWarriorComponent.scars.length; i < numScars; i++) {
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();
      const rotation = reader.readNumber();
      const type = reader.readNumber();

      tribeWarriorComponent.scars.push({
         offsetX: offsetX,
         offsetY: offsetY,
         rotation: rotation,
         type: type
      });
   }
}