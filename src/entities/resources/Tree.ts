import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import RenderComponent, { ImageRenderPart } from "../../entity-components/RenderComponent";
import { ItemName } from "../../items/items";
import { Point } from "../../utils";
import Resource from "./Resource";

class Tree extends Resource {
   private static readonly HEALTH = 10;
   public readonly name = "Tree";
   public readonly SIZE = 2;
   private static readonly LIFESPAN = 60;

   constructor(position: Point) {
      super(position);

      this.getComponent(HealthComponent)!.setMaxHealth(Tree.HEALTH, true);
      this.getComponent(HealthComponent)!.setLifespan(Tree.LIFESPAN);

      this.addResourceDrops();
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      renderComponent.addPart(new ImageRenderPart({
         type: "image",
         size: {
            width: this.SIZE,
            height: this.SIZE
         },
         url: "tree.png"
      }));
   }

   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }

   private addResourceDrops(): void {
      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.wood, [2, 5], "deathByEntity");
   }
}

export default Tree;