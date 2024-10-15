import { EntityType } from "battletribes-shared/entities";
import Tribesman from "./Tribesman";
import EquipmentComponent, { EquipmentComponentArray } from "../entity-components/server-components/EquipmentComponent";
import FootprintComponent, { FootprintComponentArray } from "../entity-components/server-components/FootprintComponent";
import { ClientComponentType } from "../entity-components/components";
import { addTribeMemberRenderParts } from "./TribeMember";

class TribeWorker extends Tribesman {
   constructor(id: number) {
      super(id);
      
      FootprintComponentArray.addComponent(this.id, new FootprintComponent(this, 0.15, 20, 64, 4, 50));
      EquipmentComponentArray.addComponent(this.id, new EquipmentComponent(this));
   }

   public onLoad(): void {
      addTribeMemberRenderParts(this.id);
   }
}

export default TribeWorker;