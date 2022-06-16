import Entity from "../entities/Entity";
import Mob from "../entities/mobs/Mob";
import Resource from "../entities/resources/Resource";
import Tribesman from "../entities/tribe-members/Tribesman";
import AttackComponent, { AttackInfo } from "../entity-components/AttackComponent";
import FiniteInventoryComponent from "../entity-components/inventory/FiniteInventoryComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Item, { ItemInfo } from "./Item";

type ToolType = "sword" | "pickaxe";

interface ToolItemInfo extends ItemInfo {
   readonly type: ToolType;
   readonly damage: number;
   readonly knockback: number;
   readonly swingTime: number;
   readonly size: number;
   readonly interactionRadius: number;
}

class ToolItem extends Item implements ToolItemInfo {
   public readonly type: ToolType;
   public readonly damage: number;
   public readonly knockback: number;
   public readonly swingTime: number;
   public readonly size: number;
   public readonly interactionRadius: number;

   constructor(toolInfo: ToolItemInfo) {
      super(toolInfo);

      this.type = toolInfo.type;
      this.damage = toolInfo.damage;
      this.knockback = toolInfo.knockback;
      this.swingTime = toolInfo.swingTime;
      this.size = toolInfo.size;
      this.interactionRadius = toolInfo.interactionRadius;
   }

   public startLeftClick(entity: Tribesman, _inventoryComponent: FiniteInventoryComponent, slotNum: number): void {
      // Get the position to interact from
      const interactPosition = entity.getInteractPosition();
      const entityPosition = entity.getComponent(TransformComponent)!.position;

      const attackInfo: AttackInfo = {
         position: interactPosition,
         origin: entityPosition,
         attackingEntity: entity,
         radius: this.interactionRadius,
         damage: (entity: Entity): number => {
            if (this.isCorrectDamageType(entity)) {
               return this.damage;
            } else {
               return 0;
            }
         },
         pierce: 1,
         knockbackStrength: (entity: Entity): number => {
            if (this.isCorrectDamageType(entity)) {
               return this.knockback;
            } else {
               return 0;
            }
         }
      }

      entity.getComponent(AttackComponent)!.attack(attackInfo);
   }

   private isCorrectDamageType(entity: Entity): boolean {
      if (entity instanceof Mob) {
         return this.type === "sword";
      } else if (entity instanceof Resource) {
         return this.type === "pickaxe";
      }

      return false;
   }
}

export default ToolItem;