import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import RenderComponent, { ImageRenderPart } from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { ItemName } from "../../items";
import RESOURCE_INFO, { ResourceInfo } from "../../resource-info";
import { Point, randFloat } from "../../utils";
import { EventType } from "../Entity";
import Resource from "./Resource";

class Tree extends Resource {
   private static readonly HEALTH = 10;
   private static readonly SIZE = 2;
   private static readonly LIFESPAN = 60;

   constructor(position: Point) {
      super(position);

      this.getComponent(TransformComponent)!.rotation = randFloat(0, 360);

      this.getComponent(HealthComponent)!.setMaxHealth(Tree.HEALTH, true);
      this.getComponent(HealthComponent)!.setLifespan(Tree.LIFESPAN);

      this.setHitbox();

      this.createRenderParts();

      this.addResourceDrops();
   }

   protected getInfo(): ResourceInfo {
      return RESOURCE_INFO.berry;
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: Tree.SIZE / 2
      });
   }

   private createRenderParts(): void {
      this.getComponent(RenderComponent)!.addPart(new ImageRenderPart({
         type: "image",
         size: {
            width: Tree.SIZE,
            height: Tree.SIZE
         },
         url: "tree.png"
      }));
   }

   private addResourceDrops(): void {
      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.wood, [2, 5], EventType.deathByEntity);
   }
}

export default Tree;