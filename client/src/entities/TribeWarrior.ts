import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Tribesman from "./Tribesman";
import FootprintComponent from "../entity-components/FootprintComponent";
import { ClientComponentType } from "../entity-components/components";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import EquipmentComponent from "../entity-components/EquipmentComponent";
import { addTribeMemberRenderParts } from "./TribeMember";
import { ComponentDataRecord } from "../Entity";

class TribeWarrior extends Tribesman {
   constructor(position: Point, id: number, ageTicks: number, componentDataRecord: ComponentDataRecord) {
      super(position, id, EntityType.tribeWarrior, ageTicks);

      addTribeMemberRenderParts(this, componentDataRecord);
      
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.15, 20, 64, 4, 64));
      this.addClientComponent(ClientComponentType.equipment, new EquipmentComponent(this));

      // @Cleanup: Do in warrior component
      const tribeWarriorComponentData = componentDataRecord[ServerComponentType.tribeWarrior]!;
      for (let i = 0; i < tribeWarriorComponentData.scars.length; i++) {
         const scarInfo = tribeWarriorComponentData.scars[i];

         const renderPart = new RenderPart(
            this,
            getTextureArrayIndex("scars/scar-" + (scarInfo.type + 1) + ".png"),
            2.5,
            scarInfo.rotation
         );
         renderPart.offset.x = scarInfo.offsetX;
         renderPart.offset.y = scarInfo.offsetY;
         this.attachRenderPart(renderPart);
      }
   }
}

export default TribeWarrior;