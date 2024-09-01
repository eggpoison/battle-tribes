import { ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createDeepFrostHeartBloodParticles } from "../particles";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class ItemComponent extends ServerComponent {
   public readonly itemType: ItemType;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.itemType = reader.readNumber();
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
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