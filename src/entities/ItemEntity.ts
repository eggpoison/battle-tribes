import Entity from "./Entity";
import HitboxComponent, { CircleHitboxInfo } from "../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Item from "../items/Item";
import { getRandomAngle, Point } from "../utils";

class ItemEntity extends Entity {
   private static readonly SIZE = 0.5;

   public readonly item: Item;

   constructor(item: Item, position: Point) {
      super([
         new TransformComponent(position, undefined, getRandomAngle()),
         new RenderComponent(),
         new HitboxComponent()
      ]);

      this.setHitbox();

      this.getComponent(RenderComponent)!.addPart(
         new ImageRenderPart({
            type: "image",
            size: {
               width: ItemEntity.SIZE,
               height: ItemEntity.SIZE
            },
            url: item.imageSrc
         })
      );

      this.item = item;
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: ItemEntity.SIZE / 2
      });
   }
}

export default ItemEntity;