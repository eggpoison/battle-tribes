import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Tribesman from "./Tribesman";
import FootprintComponent from "../entity-components/FootprintComponent";
import { ClientComponentType } from "../entity-components/components";
import HealthComponent from "../entity-components/HealthComponent";
import InventoryComponent from "../entity-components/InventoryComponent";
import InventoryUseComponent from "../entity-components/InventoryUseComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";
import { addTribeMemberRenderParts } from "./TribeMember";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import EquipmentComponent from "../entity-components/EquipmentComponent";
import TribeMemberComponent from "../entity-components/TribeMemberComponent";
import TribesmanComponent from "../entity-components/TribesmanComponent";

class TribeWarrior extends Tribesman {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tribeWarrior>) {
      super(position, id, EntityType.tribeWarrior, ageTicks);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.tribeMember, new TribeMemberComponent(this, componentsData[4]));
      addTribeMemberRenderParts(this);
      this.addServerComponent(ServerComponentType.inventory, new InventoryComponent(this, componentsData[5]));
      this.addServerComponent(ServerComponentType.inventoryUse, new InventoryUseComponent(this, componentsData[6], this.getServerComponent(ServerComponentType.tribeMember).handRenderParts));
      this.addServerComponent(ServerComponentType.tribesman, new TribesmanComponent(this, componentsData[7]));
      
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.15, 20, 64, 4, 64));
      this.addClientComponent(ClientComponentType.equipment, new EquipmentComponent(this));

      const tribeWarriorComponentData = componentsData[8];
      for (let i = 0; i < tribeWarriorComponentData.scars.length; i++) {
         const scarInfo = tribeWarriorComponentData.scars[i];

         const renderPart = new RenderPart(
            this,
            getTextureArrayIndex("scars/scar-" + (scarInfo.type + 1) + ".png"),
            3,
            scarInfo.rotation
         );
         renderPart.offset.x = scarInfo.offsetX;
         renderPart.offset.y = scarInfo.offsetY;
         this.attachRenderPart(renderPart);
      }
   }
}

export default TribeWarrior;