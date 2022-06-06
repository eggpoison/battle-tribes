import Board from "../../Board";
import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import FollowAI from "../../entity-components/ai/FollowAI";
import WanderAI from "../../entity-components/ai/WanderAI";
import AttackComponent from "../../entity-components/AttackComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import InfiniteInventoryComponent from "../../entity-components/inventory/InfiniteInventoryComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
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
import TribeWorker from "./TribeWorker";

class Tribesman extends TribeWorker {
   public readonly name = "Tribesman";
   public readonly SIZE = 1;

   private static readonly SIGHT_RANGE = 4;
   
   private static readonly MAX_HEALTH = 25;
   private static readonly DEFAULT_SLOT_COUNT = 2;

   private static readonly WANDER_SPEED = 1;
   private static readonly FOLLOW_SPEED = 2.5;

   private static readonly WANDER_RATE = 0.5;
   private static readonly TARGETS = [Mob, GenericTribeMember, Resource, ItemEntity];
   private static readonly MAX_DIST_FROM_TARGET = 1.25;

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

      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
      
      this.createAI();
   }

   private createAI(): void {
      const transformComponent = this.getComponent(TransformComponent)!;

      // If no targets are nearby, use wander AI
      // Otherwise, move to the closest target sorted based on their priority

      // Wander AI
      const wanderAI = this.getComponent(AIManagerComponent)!.addAI(
         new WanderAI("wander", {
            range: Tribesman.SIGHT_RANGE,
            speed: Tribesman.WANDER_SPEED,
            wanderRate: Tribesman.WANDER_RATE
         })
      );

      wanderAI.setSwitchCondition({
         newID: "follow",
         shouldSwitch: (): boolean => {
            if (this.targetCommandTileCoordinates !== null) return true;

            const entitiesInSearchRadius = followAI.getEntitiesInSearchRadius(transformComponent.position, Tribesman.SIGHT_RANGE, Tribesman.TARGETS);
            if (entitiesInSearchRadius !== null) {
               const targetEntities = this.sortFollowTargets(entitiesInSearchRadius);
               return targetEntities !== null;
            }
            return false;
         },
         onSwitch: (): void => {
            transformComponent.stopMoving();
         }
      });

      // Follow AI
      const followAI = this.getComponent(AIManagerComponent)!.addAI(
         new FollowAI("follow", {
            range: Tribesman.SIGHT_RANGE,
            targets: Tribesman.TARGETS
         })
      );

      let isMovingToStash = false;

      followAI.setSwitchCondition({
         newID: "wander",
         shouldSwitch: (): boolean => {
            if (this.targetCommandTileCoordinates !== null) return true;
            
            if (isMovingToStash) return false;

            const entitiesInSearchRadius = followAI.getEntitiesInSearchRadius(transformComponent.position, Tribesman.SIGHT_RANGE, Tribesman.TARGETS);
            if (entitiesInSearchRadius === null) return true;

            const targetEntities = this.sortFollowTargets(entitiesInSearchRadius);
            return targetEntities === null;
         },
         onSwitch: (): void => {
            transformComponent.stopMoving();

            this.attackTimer = null;
         }
      });

      followAI.addTickCallback(() => {
         // Move to the command position
         if (this.targetCommandTileCoordinates !== null) {
            const targetPosition = new Point((this.targetCommandTileCoordinates[0] + 0.5) * Board.tileSize, (this.targetCommandTileCoordinates[1] + 0.5) * Board.tileSize);
            followAI.moveToPosition(targetPosition, Tribesman.FOLLOW_SPEED);
            return;
         }

         // If inventory is full, move to the stash
         if (this.getComponent(FiniteInventoryComponent)!.isFull(false)) {
            isMovingToStash = true;

            const targetPosition = this.tribe.position;
            followAI.moveToPosition(targetPosition, Tribesman.FOLLOW_SPEED);

            return;
         }
         isMovingToStash = false;

         const target = followAI.getTarget();
         if (target === null) return;

         if (target instanceof LivingEntity || target instanceof GenericTribeMember) {
            const targetSize = typeof target.SIZE === "number" ? target.SIZE : (target.SIZE.WIDTH + target.SIZE.HEIGHT) / 2;

            const thisTransformComponent = this.getComponent(TransformComponent)!;
            const targetTransformComponent = target.getComponent(TransformComponent)!;

            const ROTATION_PADDING = 5;

            // Don't move to the target if they're too close
            const dist = thisTransformComponent.position.distanceFrom(targetTransformComponent.position);
            const isFacingTarget = Math.abs(thisTransformComponent.rotation - targetTransformComponent.rotation) < ROTATION_PADDING;
            if (isFacingTarget && dist - (this.SIZE/2 + targetSize/2) * Board.tileSize < Tribesman.MAX_DIST_FROM_TARGET * Board.tileSize) {
               // Stop moving
               thisTransformComponent.stopMoving();
               this.getComponent(TransformComponent)!.velocity.magnitude = 0;

               // Rotate to face the target
               const angle = thisTransformComponent.position.angleBetween(targetTransformComponent.position);
               thisTransformComponent.rotation = angle;
            } else {
               // If the target isn't too close, move to them
               followAI.moveToEntity(target, Tribesman.FOLLOW_SPEED);
            }

            // Attack the entity
            const distanceFromTarget = this.getComponent(TransformComponent)!.position.distanceFrom(target.getComponent(TransformComponent)!.position);
            if (distanceFromTarget < (Tribesman.ATTACK_RANGE + this.SIZE/2 + targetSize/2) * Board.tileSize) {
               if (this.attackTimer === null) {
                  const ATTACK_RADIUS = 1;
                  const ATTACK_OFFSET = 0.5;

                  // Calculate the attack position
                  const rotation = this.getComponent(TransformComponent)!.rotation;

                  const offset = RenderComponent.getOffset((this.SIZE / 2 + ATTACK_OFFSET) * Board.tileSize, rotation);
                  const offsetPoint = new Point(offset[0], offset[1]);

                  const attackPosition = this.getComponent(TransformComponent)!.position.add(offsetPoint);

                  // Attack
                  this.getComponent(AttackComponent)!.attack({
                     position: attackPosition,
                     attackingEntity: this,
                     radius: ATTACK_RADIUS,
                     damage: Tribesman.ATTACK_DAMAGE,
                     pierce: 1,
                     knockbackStrength: 0.3
                  });
                  
                  this.attackTimer = new Timer({
                     duration: Tribesman.ATTACK_INTERVAL,
                     onEnd: () => {
                        this.attackTimer = null;
                     }
                  });
               }
            }
         } else {
            followAI.moveToEntity(target, Tribesman.FOLLOW_SPEED);
         }
      });

      followAI.addReachTargetCallback(() => {
         if (this.targetCommandTileCoordinates === null) return;
         
         const currentTileCoordinates = this.getComponent(TransformComponent)!.getTileCoordinates();
         if (currentTileCoordinates[0] === this.targetCommandTileCoordinates[0] && currentTileCoordinates[1] === this.targetCommandTileCoordinates[1]) {
            this.targetCommandTileCoordinates = null;
         }
      });

      followAI.setTargetSortFunction((entities: Array<Entity>) => this.sortFollowTargets(entities));

      this.getComponent(AIManagerComponent)!.changeCurrentAI("wander");
   }

   private sortFollowTargets(entities: Array<Entity>): Array<Entity> | null {
      // Sort the entities by type
      const hostileMobs = new Array<Mob | GenericTribeMember>();
      const otherEntities = new Array<Mob | Resource | ItemEntity>();
      for (const entity of entities) {
         // Other tribe members
         if (entity instanceof GenericTribeMember) {
            // If it belongs to a different tribe, it can be attacked
            if (entity.tribe !== this.tribe) {
               hostileMobs.push(entity);
            }
            continue;
         }

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
            // Don't need to check if the item can be picked up, as if the inventory is full the tribesman will automatically walk to the stash
            otherEntities.push(entity);
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