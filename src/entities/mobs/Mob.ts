import Component from "../../Component";
import Entity from "../Entity";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { Point } from "../../utils";
import { MobInfo } from "../../entity-info";
import Berry from "../resources/Berry";
import LivingEntity from "../LivingEntity";

abstract class Mob extends LivingEntity<MobInfo> {
   constructor(position: Point, components?: ReadonlyArray<Component>) {
      super(position, components);
   }

   public static entityCanBeAttackedByMob(entity: Entity): boolean {
      if (entity.getComponent(HealthComponent) === null) return false;
      if (entity instanceof Mob || entity instanceof Berry) return false;
      return true;
   }
}

export default Mob;