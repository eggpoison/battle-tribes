import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "./ServerComponent";
import { createDeepFrostHeartBloodParticles } from "../particles";
import { ItemType } from "battletribes-shared/items/items";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class ItemComponent extends ServerComponent {
   public itemType = ItemType.wood;
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      this.itemType = reader.readNumber();
   }
}

export default ItemComponent;

export const ItemComponentArray = new ComponentArray<ItemComponent>(ComponentArrayType.server, ServerComponentType.item, true, {
   onTick: onTick
});

function onTick(itemComponent: ItemComponent): void {
   // Make the deep frost heart item spew blue blood particles
   if (itemComponent.itemType === ItemType.deepfrost_heart) {
      const transformComponent = itemComponent.entity.getServerComponent(ServerComponentType.transform);
      createDeepFrostHeartBloodParticles(transformComponent.position.x, transformComponent.position.y, 0, 0);
   }
}