import Tribesman from "./Tribesman";
import FootprintComponent from "../entity-components/FootprintComponent";
import { ClientComponentType } from "../entity-components/components";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import EquipmentComponent from "../entity-components/EquipmentComponent";
import { addTribeMemberRenderParts } from "./TribeMember";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { TribeWarriorComponentArray } from "../entity-components/TribeWarriorComponent";
import { getEntityRenderInfo } from "../world";

class TribeWarrior extends Tribesman {
   constructor(id: number) {
      super(id);
      
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.15, 20, 64, 4, 64));
      this.addClientComponent(ClientComponentType.equipment, new EquipmentComponent(this));
   }

   public onLoad(): void {
      addTribeMemberRenderParts(this.id);

      // @Cleanup: Do in warrior component
      const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(this.id);
      for (let i = 0; i < tribeWarriorComponent.scars.length; i++) {
         const scarInfo = tribeWarriorComponent.scars[i];

         const renderPart = new TexturedRenderPart(
            null,
            2.5,
            scarInfo.rotation,
            getTextureArrayIndex("scars/scar-" + (scarInfo.type + 1) + ".png")
         );
         renderPart.offset.x = scarInfo.offsetX;
         renderPart.offset.y = scarInfo.offsetY;

         const renderInfo = getEntityRenderInfo(this.id);
         renderInfo.attachRenderThing(renderPart);
      }
   }
}

export default TribeWarrior;