import Entity, { RenderLayer } from "./Entity";
import HitboxComponent from "../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Item from "../items/Item";
import { getRandomAngle, Point } from "../utils";
import SETTINGS from "../settings";

class ItemEntity extends Entity {
   /** The number of seconds an item entity lasts before despawning */
   private static readonly LIFESPAN = 60;

   public readonly name = "Item";
   public readonly SIZE = 0.5;

   public readonly item: Item;
   /** How many items are contained in the item entity */
   public readonly amount: number;

   private age: number = 0;

   constructor(position: Point, item: Item, amount: number) {
      super(RenderLayer.Items, [
         new TransformComponent(position, undefined, getRandomAngle(), true),
         new RenderComponent(),
         new HitboxComponent()
      ]);

      this.setHitbox();

      this.getComponent(RenderComponent)!.addPart(
         new ImageRenderPart({
            size: {
               width: this.SIZE,
               height: this.SIZE
            },
            url: item.imageSrc
         })
      );

      this.item = item;
      this.amount = amount;
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