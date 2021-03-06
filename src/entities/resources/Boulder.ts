import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import RenderComponent, { ImageRenderPart } from "../../entity-components/RenderComponent";
import { ItemName } from "../../items/items";
import { Point } from "../../utils";
import { RenderLayer } from "../Entity";
import Resource from "./Resource";

class Boulder extends Resource {
   private static readonly HEALTH = 40;
   private static readonly LIFESPAN = 50;

   public readonly name = "Boulder";
   public readonly SIZE: number = 1.3;

   constructor(position: Point) {
      super(RenderLayer.LowResources, position);

      this.getComponent(HealthComponent)!.setMaxHealth(Boulder.HEALTH, true);
      
      this.getComponent(HealthComponent)!.setLifespan(Boulder.LIFESPAN);

      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.rock, [1, 3], "deathByEntity");
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      renderComponent.addPart(new ImageRenderPart({
         size: {
            width: this.SIZE,
            height: this.SIZE
         },
         url: "boulder.png"
      }));
   }

   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }
}

export default Boulder;