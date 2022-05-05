import Component from "../../Component";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { ResourceInfo } from "../../resource-info";
import { Point } from "../../utils";
import Entity from "../Entity";

abstract class Resource extends Entity {
   constructor(position: Point, components?: ReadonlyArray<Component>) {
      super([
         new TransformComponent(position),
         new HealthComponent(),
         new HitboxComponent(),
         new RenderComponent(),
         new ItemSpawnComponent(),
         ...(components || [])
      ]);
   }

   protected abstract getInfo(): ResourceInfo;
}

export default Resource;