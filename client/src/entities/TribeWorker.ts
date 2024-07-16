import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Tribesman from "./Tribesman";
import EquipmentComponent from "../entity-components/EquipmentComponent";
import FootprintComponent from "../entity-components/FootprintComponent";
import { ClientComponentType } from "../entity-components/components";
import { addTribeMemberRenderParts } from "./TribeMember";
import { ComponentDataRecord } from "../Entity";

class TribeWorker extends Tribesman {
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.tribeWorker);

      addTribeMemberRenderParts(this, componentDataRecord);
      
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.15, 20, 64, 4, 50));
      this.addClientComponent(ClientComponentType.equipment, new EquipmentComponent(this));
   }
}

export default TribeWorker;