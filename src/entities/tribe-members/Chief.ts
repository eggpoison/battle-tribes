import Entity from "../Entity";
import HitboxComponent from "../../entity-components/HitboxComponent";
import AttackComponent from "../../entity-components/AttackComponent";
import ItemEntity from "../ItemEntity";
import TribeStash from "../TribeStash";
import Tribe from "../../Tribe";
import HealthComponent from "../../entity-components/HealthComponent";
import Tribesman from "./Tribesman";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import Component from "../../Component";

class Chief extends Tribesman {
   public readonly name = "Chief";
   public readonly SIZE = 1;

   private static readonly SIGHT_RANGE = 5;

   public static readonly SPEED = 4;
   public static readonly HEALTH = 20;

   public static readonly DEFAULT_INVENTORY_SLOT_COUNT = 3;

   public static isOpeningStash: boolean = false;

   constructor(tribe: Tribe, components?: ReadonlyArray<Component>) {
      super(tribe, [
         new AttackComponent(),
         new FiniteInventoryComponent(Chief.DEFAULT_INVENTORY_SLOT_COUNT),
         ...(components || [])
      ]);

      super.setSightRange(Chief.SIGHT_RANGE);

      this.getComponent(HealthComponent)!.setMaxHealth(Chief.HEALTH, true);

      this.setHitbox();
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }

   public onCollision(collidingEntity: Entity): void {
      if (collidingEntity instanceof ItemEntity) {
         // Pick up the item
         const inventoryComponent = this.getComponent(FiniteInventoryComponent)!;
         inventoryComponent.pickupItemEntity(collidingEntity);
      } else if (collidingEntity instanceof TribeStash) {
         // TODO: Deposit all items
      }
   }
}

export default Chief;