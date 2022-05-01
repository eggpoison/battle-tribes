import Component from "../../Component";
import Entity from "../Entity";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { Point } from "../../utils";
import { MobInfo } from "../../mob-info";

abstract class Mob extends Entity {
   public abstract getInfo(): MobInfo;

   constructor(position: Point, maxHealth: number, components?: ReadonlyArray<Component>) {
      super([
         new TransformComponent(),
         new RenderComponent(),
         new HitboxComponent(),
         new HealthComponent(maxHealth),
         ...(components || [])
      ]);

      this.getComponent(TransformComponent)!.position = position;
   }
}

export default Mob;