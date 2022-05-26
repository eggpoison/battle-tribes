import HitboxComponent from "../../entity-components/HitboxComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import RenderComponent, { ImageRenderPart } from "../../entity-components/RenderComponent";
import { ItemName } from "../../items/items";
import { Point, randInt } from "../../utils";
import Resource from "./Resource";

class Flower extends Resource {
   public readonly SIZE = 0.3;

   constructor(position: Point) {
      super(position);
      
      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.flower, 1, "deathByEntity");
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      const IMAGE_NUM = randInt(1, 1);
      
      renderComponent.addPart(
         new ImageRenderPart({
            type: "image",
            size: {
               width: this.SIZE,
               height: this.SIZE
            },
            url: `flower-${IMAGE_NUM}.png`
         })
      );
   }
   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }
}

export default Flower;