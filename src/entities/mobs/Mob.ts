import Entity from "../Entity";
import HealthComponent from "../../entity-components/HealthComponent";
import { MobInfo } from "../../entity-info";
import Berry from "../resources/Berry";
import LivingEntity from "../LivingEntity";

abstract class Mob extends LivingEntity<MobInfo> {
   public static entityCanBeAttackedByMob(entity: Entity): boolean {
      if (entity.getComponent(HealthComponent) === null) return false;
      if (entity instanceof Mob || entity instanceof Berry) return false;
      return true;
   }
}

export default Mob;