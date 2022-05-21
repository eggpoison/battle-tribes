import Entity from "../entities/Entity";
import HealthComponent from "../entity-components/HealthComponent";
import Item, { ItemInfo } from "./Item";

interface FoodItemInfo extends ItemInfo {
   /** Amount of entity health restored by eating. */
   readonly cooldown: number;
   /** The time it takes to eat one of the food, in seconds. */
   readonly eatTime: number;
}

class FoodItem extends Item implements FoodItemInfo {
   public readonly cooldown: number;
   public readonly eatTime: number;
   
   constructor(itemInfo: FoodItemInfo) {
      super(itemInfo);

      this.cooldown = itemInfo.cooldown;
      this.eatTime = itemInfo.eatTime;
   }

   public use(entity: Entity): void {
      super.use(entity);

      entity.getComponent(HealthComponent)!.heal(this.cooldown);
   }
}

export default FoodItem;