import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import Tribesman from "./Tribesman";
import FootprintComponent from "../entity-components/FootprintComponent";
import { ClientComponentType } from "../entity-components/components";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import EquipmentComponent from "../entity-components/EquipmentComponent";
import { addTribeMemberRenderParts } from "./TribeMember";
import { ComponentDataRecord } from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class TribeWarrior extends Tribesman {
   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.tribeWarrior);

      addTribeMemberRenderParts(this, componentDataRecord);
      
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.15, 20, 64, 4, 64));
      this.addClientComponent(ClientComponentType.equipment, new EquipmentComponent(this));

      // @Cleanup: Do in warrior component
      const tribeWarriorComponentData = componentDataRecord[ServerComponentType.tribeWarrior]!;
      for (let i = 0; i < tribeWarriorComponentData.scars.length; i++) {
         const scarInfo = tribeWarriorComponentData.scars[i];

         const renderPart = new TexturedRenderPart(
            this,
            2.5,
            scarInfo.rotation,
            getTextureArrayIndex("scars/scar-" + (scarInfo.type + 1) + ".png")
         );
         renderPart.offset.x = scarInfo.offsetX;
         renderPart.offset.y = scarInfo.offsetY;
         this.attachRenderPart(renderPart);
      }
   }
}

export default TribeWarrior;