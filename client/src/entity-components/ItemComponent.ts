import { ItemComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createDeepFrostHeartBloodParticles } from "../particles";
import { ItemType } from "webgl-test-shared/dist/items/items";

class ItemComponent extends ServerComponent<ServerComponentType.item> {
   public readonly itemType: ItemType;
   
   constructor(entity: Entity, data: ItemComponentData) {
      super(entity);

      this.itemType = data.itemType;
   }

   public tick(): void {
      // Make the deep frost heart item spew blue blood particles
      if (this.itemType === ItemType.deepfrost_heart) {
         createDeepFrostHeartBloodParticles(this.entity.position.x, this.entity.position.y, 0, 0);
      }
   }
   
   public updateFromData(_data: ItemComponentData): void {}
}

export default ItemComponent;