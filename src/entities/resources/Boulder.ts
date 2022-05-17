import HitboxComponent from "../../entity-components/HitboxComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import RenderComponent, { ImageRenderPart } from "../../entity-components/RenderComponent";
import { ItemName } from "../../items/items";
import { Point } from "../../utils";
import Resource from "./Resource";

class Boulder extends Resource {
   public readonly SIZE: number = 1.3;
   private static readonly HEALTH = 20;

   constructor(position: Point) {
      super(position);

      this.setMaxHealth(Boulder.HEALTH);

      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.rock, [1, 3], "deathByEntity");
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      renderComponent.addPart(new ImageRenderPart({
         type: "image",
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