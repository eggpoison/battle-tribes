import Entity from "./Entity";
import HitboxComponent, { CircleHitboxInfo } from "../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Item from "../items/Item";
import { getRandomAngle, Point } from "../utils";

class Resource extends Entity {
   public readonly item: Item;

   constructor(item: Item, position: Point) {
      const SIZE = 0.5;

      const HITBOX: CircleHitboxInfo = {
         type: "circle",
         radius: SIZE / 2
      };

      super([
         new TransformComponent(position, undefined, getRandomAngle()),
         new RenderComponent(),
         new HitboxComponent(HITBOX)
      ]);

      this.getComponent(RenderComponent)!.addPart(
         new ImageRenderPart({
            type: "image",
            size: {
               width: SIZE,
               height: SIZE
            },
            url: item.imageSrc
         })
      );

      this.item = item;
   }
}

export default Resource;