import Component from "../../Component";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { ResourceInfo } from "../../data/entity-info";
import { Point, randFloat } from "../../utils";
import LivingEntity from "../LivingEntity";

abstract class Resource extends LivingEntity<ResourceInfo> {
   constructor(position: Point, components?: ReadonlyArray<Component>) {
      super(position, [
         new ItemSpawnComponent(),
         ...(components || [])
      ]);

      // Give the resource a random rotation
      this.getComponent(TransformComponent)!.rotation = randFloat(0, 360);
   }

   public onLoad(): void {
      this.createRenderParts(this.getComponent(RenderComponent)!);
      this.setHitbox(this.getComponent(HitboxComponent)!);
   }

   protected abstract createRenderParts(renderComponent: RenderComponent): void;
   protected abstract setHitbox(hitboxComponent: HitboxComponent): void;
}

export default Resource;