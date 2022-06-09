import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../../entity-components/RenderComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import { ItemName } from "../../items/items";
import { Point } from "../../utils";
import Resource from "./Resource";
import { RenderLayer } from "../Entity";

class Berry extends Resource {
   public readonly name = "Berry";
   public readonly SIZE = 1;

   private static readonly HEALTH = 10;
   private static readonly LIFESPAN = 30;

   constructor(position: Point) {
      super(RenderLayer.LowResources, position);

      this.getComponent(HealthComponent)!.setMaxHealth(Berry.HEALTH, true);
      this.getComponent(HealthComponent)!.setLifespan(Berry.LIFESPAN);

      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.berry, [1, 2], "deathByEntity");
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      renderComponent.addPart(
         new ImageRenderPart({
            type: "image",
            url: "berry.png",
            size: {
               width: this.SIZE,
               height: this.SIZE
            }
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

export default Berry;