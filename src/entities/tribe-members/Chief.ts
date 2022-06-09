import Entity from "../Entity";
import TransformComponent from "../../entity-components/TransformComponent";
import { Point } from "../../utils";
import RenderComponent from "../../entity-components/RenderComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import AttackComponent from "../../entity-components/AttackComponent";
import ItemEntity from "../ItemEntity";
import TribeStash from "../TribeStash";
import Tribe from "../../Tribe";
import Board from "../../Board";
import HealthComponent from "../../entity-components/HealthComponent";
import GenericTribeMember from "./GenericTribeMember";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import Component from "../../Component";

class Chief extends GenericTribeMember {
   public readonly name = "Chief";
   public readonly SIZE = 1;

   private static readonly SIGHT_RANGE = 5;

   public static readonly SPEED = 5;
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

      /** The distance away from the player (in tiles) that the attack is performed */
      const ATTACK_OFFSET = 0.5;

      const attackComponent = this.getComponent(AttackComponent)!;

      attackComponent.addAttack("baseAttack", {
         attackingEntity: this,
         position: (): Point => {
            const rotation = this.getComponent(TransformComponent)!.rotation;
            
            const offset = RenderComponent.getOffset((this.SIZE / 2 + ATTACK_OFFSET) * Board.tileSize, rotation);
            const offsetPoint = new Point(offset[0], offset[1]);
            
            return this.getComponent(TransformComponent)!.position.add(offsetPoint);
         },
         origin: (): Point => {
            return this.getComponent(TransformComponent)!.position;
         },
         radius: 1,
         damage: 2,
         pierce: 1,
         knockbackStrength: 0.3
      });
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