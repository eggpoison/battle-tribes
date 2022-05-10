import HitboxComponent from "../../entity-components/HitboxComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import RenderComponent, { ImageRenderPart } from "../../entity-components/RenderComponent";
import { ItemName } from "../../items/items";
import RESOURCE_INFO, { ResourceInfo } from "../../resource-info";
import { Point } from "../../utils";
import { EventType } from "../Entity";
import Resource from "./Resource";

class Boulder extends Resource {
   private static readonly SIZE = 1.3;
   private static readonly HEALTH = 20;

   constructor(position: Point) {
      super(position);

      this.setMaxHealth(Boulder.HEALTH);

      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.rock, [1, 3], EventType.deathByEntity);
   }

   public getInfo(): ResourceInfo {
      return RESOURCE_INFO.boulder;
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      renderComponent.addPart(new ImageRenderPart({
         type: "image",
         size: {
            width: Boulder.SIZE,
            height: Boulder.SIZE
         },
         url: "boulder.png"
      }));
   }

   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "circle",
         radius: Boulder.SIZE / 2
      });
   }
}

export default Boulder;