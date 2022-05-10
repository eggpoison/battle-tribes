import Component from "../../Component";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { ResourceInfo } from "../../resource-info";
import { Point, randFloat } from "../../utils";
import Entity from "../Entity";

abstract class Resource extends Entity {
   constructor(position: Point, components?: ReadonlyArray<Component>) {
      const transformComponent = new TransformComponent(position);
      const renderComponent = new RenderComponent();
      const hitboxComponent = new HitboxComponent();

      super([
         transformComponent,
         new HealthComponent(),
         hitboxComponent,
         renderComponent,
         new ItemSpawnComponent(),
         ...(components || [])
      ]);

      transformComponent.rotation = randFloat(0, 360);

      this.createRenderParts(renderComponent);
      this.setHitbox(hitboxComponent);
   }

   protected abstract getInfo(): ResourceInfo;

   protected abstract createRenderParts(renderComponent: RenderComponent): void;
   protected abstract setHitbox(hitboxComponent: HitboxComponent): void;
}

export default Resource;