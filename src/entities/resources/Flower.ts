import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import RenderComponent, { ImageRenderPart } from "../../entity-components/RenderComponent";
import { ItemName } from "../../items/items";
import { Point, randInt } from "../../utils";
import { RenderLayer } from "../Entity";
import Resource from "./Resource";

class Flower extends Resource {
   public readonly name = "Flower";
   public readonly SIZE = 0.3;

   private static readonly LIFESPAN = 20;

   constructor(position: Point) {
      super(RenderLayer.LowResources, position);

      this.getComponent(HealthComponent)!.setLifespan(Flower.LIFESPAN);
      
      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.flower, 1, "deathByEntity");
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      const IMAGE_NUM = randInt(1, 1);
      
      renderComponent.addPart(
         new ImageRenderPart({
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