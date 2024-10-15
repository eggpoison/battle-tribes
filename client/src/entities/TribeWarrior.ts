import Tribesman from "./Tribesman";
import FootprintComponent, { FootprintComponentArray } from "../entity-components/server-components/FootprintComponent";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import EquipmentComponent, { EquipmentComponentArray } from "../entity-components/server-components/EquipmentComponent";
import { addTribeMemberRenderParts } from "./TribeMember";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { TribeWarriorComponentArray } from "../entity-components/server-components/TribeWarriorComponent";
import { getEntityRenderInfo } from "../world";

class TribeWarrior extends Tribesman {
   constructor(id: number) {
      super(id);
      
      FootprintComponentArray.addComponent(this.id, new FootprintComponent(this, 0.15, 20, 64, 4, 64));
      EquipmentComponentArray.addComponent(this.id, new EquipmentComponent(this));
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