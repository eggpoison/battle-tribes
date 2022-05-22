import Entity from "./Entity";
import HitboxComponent from "../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Item from "../items/Item";
import { getRandomAngle, Point } from "../utils";
import SETTINGS from "../settings";

class ItemEntity extends Entity {
   /** The number of seconds an item entity lasts before despawning */
   private static readonly LIFESPAN = 60;

   public readonly SIZE = 0.5;

   public readonly item: Item;

   private age: number = 0;

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

   public tick(): void {
      this.age += 1 / SETTINGS.tps;

      if (this.age >= ItemEntity.LIFESPAN) this.die(null);
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }
}

export default ItemEntity;