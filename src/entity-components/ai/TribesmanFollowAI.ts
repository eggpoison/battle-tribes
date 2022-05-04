import Board from "../../Board";
import Entity from "../../entities/Entity";
import ItemEntity from "../../entities/ItemEntity";
import Mob from "../../entities/mobs/Mob";
import Tribesman from "../../entities/tribe-members/Tribesman";
import Timer from "../../Timer";
import { ConstructorFunction } from "../../utils";
import AttackComponent from "../AttackComponent";
import InventoryComponent from "../InventoryComponent";
import TransformComponent from "../TransformComponent";
import FollowAI from "./FollowAI";

class TribesmanFollowAI extends FollowAI {
   private readonly stopRange: number;

   private isAttacking: boolean = false;

   constructor(searchRadius: number, moveSpeed: number, stopRange: number, validEntityConstr: ReadonlyArray<ConstructorFunction>) {
      super(searchRadius, moveSpeed, validEntityConstr);

      this.stopRange = stopRange;
   }

   public shouldSwitch(): boolean {
      const visibleEntities = super.getEntitiesInSearchRadius();
      return visibleEntities !== null;
   }

   protected filterEntities(entityArray: ReadonlyArray<Entity>): Array<Entity> {
      const filteredEntities = super.filterEntities(entityArray);

      // Remove any items which can't be picked up
      for (let idx = filteredEntities.length - 1; idx >= 0; idx--) {
         const entity = filteredEntities[idx];

         if (entity instanceof ItemEntity) {
            const inventoryComponent = this.entity.getComponent(InventoryComponent)!;
            const item = entity.item;
            
            if (!inventoryComponent.canPickupItem(item)) {
               filteredEntities.splice(idx, 1);
            }
         }
      }

      return filteredEntities;
   }

   public tick(): void {
      const closestEntity = super.findClosestEntity();

      if (closestEntity !== null) {
         const position = closestEntity.getPosition();

         if (closestEntity instanceof Mob) {
            const thisPosition = this.entity.getPosition();
   
            const dist = thisPosition.distanceFrom(position);

            if (dist > this.stopRange * Board.tileSize) {
               super.moveToPosition(position, this.moveSpeed);
            } else {
               // If the tribesman is in range to attack
               if (!this.isAttacking) {
                  this.entity.getComponent(AttackComponent)!.startAttack("baseAttack");
                  
                  this.isAttacking = true;
   
                  new Timer(Tribesman.ATTACK_INTERVAL, () => {
                     this.isAttacking = false;
                  });
               }
   
               // Rotate it to look at the entity
               const angle = thisPosition.angleBetween(position);
               this.entity.getComponent(TransformComponent)!.rotation = angle;
            }
         } else {
            // If it's an item

            super.moveToPosition(position, this.moveSpeed);
         }
      } else {
         super.changeCurrentAI("wander");
      }
   }
}

export default TribesmanFollowAI;