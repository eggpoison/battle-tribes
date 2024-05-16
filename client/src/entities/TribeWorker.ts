import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Tribesman from "./Tribesman";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import HealthComponent from "../entity-components/HealthComponent";
import InventoryComponent from "../entity-components/InventoryComponent";
import InventoryUseComponent from "../entity-components/InventoryUseComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";
import { addTribeMemberRenderParts } from "./TribeMember";
import TribesmanComponent from "../entity-components/TribesmanComponent";
import EquipmentComponent from "../entity-components/EquipmentComponent";
import TribeMemberComponent from "../entity-components/TribeMemberComponent";
import PhysicsComponent from "../entity-components/PhysicsComponent";

class TribeWorker extends Tribesman {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tribeWorker>) {
      super(position, id, EntityType.tribeWorker, ageTicks);

      this.addServerComponent(ServerComponentType.physics, new PhysicsComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.tribeMember, new TribeMemberComponent(this, componentsData[4]));
      addTribeMemberRenderParts(this);
      this.addServerComponent(ServerComponentType.inventory, new InventoryComponent(this, componentsData[5]));
      this.addServerComponent(ServerComponentType.inventoryUse, new InventoryUseComponent(this, componentsData[6], this.getServerComponent(ServerComponentType.tribeMember).handRenderParts));
      this.addServerComponent(ServerComponentType.tribesman, new TribesmanComponent(this, componentsData[7]));
      
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.15, 20, 64, 4, 50));
      this.addClientComponent(ClientComponentType.equipment, new EquipmentComponent(this));
   }
}

export default TribeWorker;