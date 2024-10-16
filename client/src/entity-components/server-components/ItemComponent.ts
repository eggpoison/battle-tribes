import { ServerComponentType } from "battletribes-shared/components";
import { createDeepFrostHeartBloodParticles } from "../../particles";
import { ItemType } from "battletribes-shared/items/items";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";

class ItemComponent {
   public itemType = ItemType.wood;
}

export default ItemComponent;

export const ItemComponentArray = new ServerComponentArray<ItemComponent>(ServerComponentType.item, true, {
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function onTick(itemComponent: ItemComponent, entity: EntityID): void {
   // Make the deep frost heart item spew blue blood particles
   if (itemComponent.itemType === ItemType.deepfrost_heart) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      createDeepFrostHeartBloodParticles(transformComponent.position.x, transformComponent.position.y, 0, 0);
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const itemComponent = ItemComponentArray.getComponent(entity);
   itemComponent.itemType = reader.readNumber();
}