import { EntityType } from "webgl-test-shared/dist/entities";
import Tribesman from "./Tribesman";
import EquipmentComponent from "../entity-components/EquipmentComponent";
import FootprintComponent from "../entity-components/FootprintComponent";
import { ClientComponentType } from "../entity-components/components";
import { addTribeMemberRenderParts } from "./TribeMember";

class TribeWorker extends Tribesman {
   constructor(id: number) {
      super(id, EntityType.tribeWorker);
      
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.15, 20, 64, 4, 50));
      this.addClientComponent(ClientComponentType.equipment, new EquipmentComponent(this));
   }

   public onLoad(): void {
      addTribeMemberRenderParts(this);
   }
}

export default TribeWorker;