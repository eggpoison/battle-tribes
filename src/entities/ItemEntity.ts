import Entity from "./Entity";
import HitboxComponent from "../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Item from "../items/Item";
import { getRandomAngle, Point } from "../utils";

class ItemEntity extends Entity {
   public readonly SIZE = 0.5;

   public readonly item: Item;

   constructor(item: Item, position: Point) {
      super([
         new TransformComponent(position, undefined, getRandomAngle(), true),
         new RenderComponent(),
         new HitboxComponent()
      ]);

      this.setHitbox();

      this.getComponent(RenderComponent)!.addPart(
         new ImageRenderPart({
            type: "image",
            size: {
               width: this.SIZE,
               height: this.SIZE
            },
            url: item.imageSrc
         })
      );

      this.item = item;
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }
}

export default ItemEntity;