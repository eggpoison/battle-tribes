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
import TribeMemberComponent from "../../entity-components/TribeMemberComponent";
import Timer from "../../Timer";
import Tribe from "../../Tribe";
import { Point } from "../../utils";
import Entity from "../Entity";
import ItemEntity from "../ItemEntity";
import LivingEntity from "../LivingEntity";
import Mob from "../mobs/Mob";
import Resource from "../resources/Resource";
import TribeStash from "../TribeStash";
import GenericTribeMember from "./GenericTribeMember";
import Player from "./Player";

class Tribesman extends GenericTribeMember {
   public readonly SIZE = 1;

   private static readonly SIGHT_RANGE = 4;
   
   private static readonly MAX_HEALTH = 25;
   private static readonly DEFAULT_SLOT_COUNT = 2;

   private static readonly WALK_SPEED = 1;
   private static readonly RUN_SPEED = 2.5;

   private static readonly WANDER_RATE = 0.5;
   private static readonly TARGETS = [Mob, Resource, ItemEntity];
   private static readonly MAX_DIST_FROM_TARGET = 1;

   private static readonly ATTACK_RANGE = 2;
   private static readonly ATTACK_DAMAGE = 5;
   public static readonly ATTACK_INTERVAL = 0.25;

   private attackTimer: Timer | null = null;

   constructor(tribe: Tribe) {
      super(tribe, [
         new AIManagerComponent(),
         new AttackComponent(),
         new FiniteInventoryComponent(Tribesman.DEFAULT_SLOT_COUNT)
      ]);

      super.setSightRange(Tribesman.SIGHT_RANGE);
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
            knockbackStrength: 0.3,
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
      const transformComponent = this.getComponent(TransformComponent)!;

      // If no targets are nearby, use wander AI
      // Otherwise, move to the closest target sorted based on their priority

      // Wander AI
      const wanderAI = this.getComponent(AIManagerComponent)!.addAI(
         new WanderAI("wander", {
            range: Tribesman.SIGHT_RANGE,
            speed: Tribesman.WALK_SPEED,
            wanderRate: Tribesman.WANDER_RATE
         })
      );

      wanderAI.setSwitchCondition({
         newID: "follow",
         shouldSwitch: (): boolean => {
            const entitiesInSearchRadius = wanderAI.getEntitiesInSearchRadius(transformComponent.position, Tribesman.SIGHT_RANGE, Tribesman.TARGETS);

            return entitiesInSearchRadius !== null;
         },
         onSwitch: (): void => {
            transformComponent.stopMoving();
         }
      });

      // Follow AI
      const followAI = this.getComponent(AIManagerComponent)!.addAI(
         new FollowAI("follow", {
            range: Tribesman.SIGHT_RANGE,
            speed: Tribesman.RUN_SPEED,
            targets: Tribesman.TARGETS
         })
      ) as FollowAI;

      let isMovingToStash = false;

      followAI.setSwitchCondition({
         newID: "wander",
         shouldSwitch: (): boolean => {
            if (isMovingToStash) return false;

            const entitiesInSearchRadius = followAI.getEntitiesInSearchRadius(transformComponent.position, Tribesman.SIGHT_RANGE, Tribesman.TARGETS);
            return entitiesInSearchRadius === null;
         },
         onSwitch: (): void => {
            transformComponent.stopMoving();

            this.attackTimer = null;
         }
      });

      followAI.setTickCondition(() => {
         // Move to stash
         if (this.getComponent(FiniteInventoryComponent)!.isFull()) {
            isMovingToStash = true;

            const targetPosition = this.getComponent(TribeMemberComponent)!.tribe.position;
            followAI.moveToPosition(targetPosition, Tribesman.RUN_SPEED);

            return false;
         }
         isMovingToStash = false;

         const target = followAI.target;
         if (target !== null && target instanceof LivingEntity) {
            const targetSize = typeof target.SIZE === "number" ? target.SIZE : (target.SIZE.WIDTH + target.SIZE.HEIGHT) / 2;

            // Don't move to the target if they're too close
            let hasStopped = false;
            const targetPosition = target.getComponent(TransformComponent)!.position;
            const dist = this.getComponent(TransformComponent)!.position.distanceFrom(targetPosition);
            if (target !== null && dist < (Tribesman.MAX_DIST_FROM_TARGET + this.SIZE/2 + targetSize/2) * Board.tileSize) {
               // Stop moving
               this.getComponent(TransformComponent)!.stopMoving();
               this.getComponent(TransformComponent)!.velocity.magnitude = 0;
               hasStopped = true;
            }

            const distanceFromTarget = this.getComponent(TransformComponent)!.position.distanceFrom(target.getComponent(TransformComponent)!.position);
            if (distanceFromTarget < (Tribesman.ATTACK_RANGE + this.SIZE/2 + targetSize/2) * Board.tileSize) {
               if (this.attackTimer === null) {
                  // Attack
                  this.getComponent(AttackComponent)!.startAttack("baseAttack");
                  
                  this.attackTimer = new Timer({
                     duration: Tribesman.ATTACK_INTERVAL,
                     onEnd: () => {
                        this.attackTimer = null;
                     }
                  });
               }
            }

            if (hasStopped) return false;
         }

         return true;
      });

      followAI.createSortFunction((entities: Array<Entity>) => this.sortFollowTargets(entities));

      this.getComponent(AIManagerComponent)!.changeCurrentAI("wander");
   }

   private sortFollowTargets(entities: Array<Entity>): Array<Entity> | null {
      // Sort the entities by type
      const hostileMobs = new Array<Mob>();
      const otherEntities = new Array<Mob | Resource | ItemEntity>();
      for (const entity of entities) {
         // Mobs
         if (entity instanceof Mob) {
            switch (entity.entityInfo.behaviour) {
               case "hostile":
                  hostileMobs.push(entity);
                  break;
               default:
                  otherEntities.push(entity);
                  break;
            }
            continue;
         }

         // Resources
         if (entity instanceof Resource) {
            otherEntities.push(entity);
            continue;
         }

         // Item entities
         if (entity instanceof ItemEntity) {
            // Only add it if it can be picked up
            if (this.getComponent(FiniteInventoryComponent)!.canPickupItem(entity.item)) {
               otherEntities.push(entity);
            }
            continue;
         }
      }

      if (hostileMobs.length > 0) {
         return hostileMobs;
      } else if (otherEntities.length > 0) {
         return otherEntities;
      }
      return null;
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