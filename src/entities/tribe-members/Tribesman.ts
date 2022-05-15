import Board from "../../Board";
import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import FollowAI from "../../entity-components/ai/FollowAI";
import WanderAI from "../../entity-components/ai/WanderAI";
import AttackComponent, { CircleAttack } from "../../entity-components/AttackComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import InfiniteInventoryComponent from "../../entity-components/inventory/InfiniteInventoryComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import Tribe from "../../Tribe";
import { ConstructorFunction, Point } from "../../utils";
import Entity from "../Entity";
import ItemEntity from "../ItemEntity";
import Mob from "../mobs/Mob";
import Resource from "../resources/Resource";
import TribeStash from "../TribeStash";
import GenericTribeMember from "./GenericTribeMember";
import Player from "./Player";

class Tribesman extends GenericTribeMember {
   public readonly SIZE = 1;
   
   private static readonly MAX_HEALTH = 250;
   private static readonly DEFAULT_SLOT_COUNT = 2;

   private static readonly ATTACK_DAMAGE = 50;
   public static readonly ATTACK_INTERVAL = 0.25;

   constructor(tribe: Tribe) {
      super(tribe, [
         new AIManagerComponent(),
         new AttackComponent(),
         new FiniteInventoryComponent(Tribesman.DEFAULT_SLOT_COUNT)
      ]);

      super.setMaxHealth(Tribesman.MAX_HEALTH);

      const HAND_SIZE = 0.45;
      const HAND_ANGLES = 40 / 180 * Math.PI;

      super.createRenderParts(this.SIZE, HAND_SIZE, Player.TRIBE_COLOUR, Player.TRIBE_COLOUR, HAND_ANGLES);

      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });

      this.createAttacks();
      
      this.createAI();
   }

   private createAttacks(): void {
      const ATTACK_RADIUS = 1;
      const ATTACK_OFFSET = 0.5;
      
      this.getComponent(AttackComponent)!.addAttack("baseAttack", new CircleAttack({
            radius: ATTACK_RADIUS,
            damage: Tribesman.ATTACK_DAMAGE,
            knockbackStrength: 5,
            getPosition: (): Point => {
               const rotation = this.getComponent(TransformComponent)!.rotation;

               const offset = RenderComponent.getOffset((this.SIZE / 2 + ATTACK_OFFSET) * Board.tileSize, rotation);
               const offsetPoint = new Point(offset[0], offset[1]);
   
               return this.getComponent(TransformComponent)!.position.add(offsetPoint);
            },
            attackingEntity: this
      }));
   }

   private createAI(): void {
      const WALK_SPEED = 1;
      const RUN_SPEED = 2.5;
      
      const VISION_RANGE = 4;

      const ATTACK_RANGE = 1;

      const WANDER_CHANCE = 0.5;

      const targets: ReadonlyArray<ConstructorFunction> = [Mob, Resource, ItemEntity];

      // Wander AI
      this.getComponent(AIManagerComponent)!.addAI(
         new WanderAI("wander", {
            range: VISION_RANGE,
            speed: WALK_SPEED,
            wanderRate: WANDER_CHANCE
         })
      );
      // Follow AI
      this.getComponent(AIManagerComponent)!.addAI(
         new FollowAI("follow", {
            range: VISION_RANGE,
            speed: RUN_SPEED,
            targets: targets
         })
      );

      this.getComponent(AIManagerComponent)!.changeCurrentAI("wander");
   }

   protected duringCollision(collidingEntity: Entity): void {
      if (collidingEntity instanceof ItemEntity) {
         // Pick up the item
         const inventoryComponent = this.getComponent(FiniteInventoryComponent)!;
         inventoryComponent.pickupResource(collidingEntity);
      } else if (collidingEntity instanceof TribeStash) {
         // Put all items into the stash
         const inventoryComponent = collidingEntity.getComponent(InfiniteInventoryComponent)!;

         const thisInventoryComponent = this.getComponent(FiniteInventoryComponent)!;

         const inventory = thisInventoryComponent.getItemSlots();
         for (let slotNum = 0; slotNum < thisInventoryComponent.slotCount; slotNum++) {
            const slot = inventory[slotNum];

            if (typeof slot !== "undefined") {
               const addAmount = inventoryComponent.getItemAddAmount(slot[0], slot[1]);

               if (addAmount !== null) {
                  inventoryComponent.addItem(slot[0], addAmount);

                  thisInventoryComponent.removeItemFromSlot(slotNum, addAmount);
               } else {
                  // If the item can't be added to the stash, remove it from the tribe member's inventory
                  thisInventoryComponent.removeItemFromSlot(slotNum, slot[1]);
               }
            }
         }
      }
   }
}

export default Tribesman;