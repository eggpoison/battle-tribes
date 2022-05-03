import Component from "../../Component";
import Entity from "../Entity";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { Point } from "../../utils";
import { MobInfo } from "../../mob-info";
import Berry from "../resources/Berry";

abstract class Mob extends Entity {
   public abstract getInfo(): MobInfo;

   constructor(position: Point, components?: ReadonlyArray<Component>) {
      super([
         new TransformComponent(),
         new RenderComponent(),
         new HitboxComponent(),
         new HealthComponent(),
         ...(components || [])
      ]);

      this.getComponent(TransformComponent)!.position = position;
   }

   public static entityCanBeAttackedByMob(entity: Entity): boolean {
      if (entity.getComponent(HealthComponent) === null) return false;
      if (entity instanceof Mob || entity instanceof Berry) return false;
      return true;
   }
}

export default Mob;