import Board from "../../Board";
import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import FollowAI from "../../entity-components/ai/FollowAI";
import WanderAI from "../../entity-components/ai/WanderAI";
import AttackComponent from "../../entity-components/AttackComponent";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import Timer from "../../Timer";
import Tribe from "../../Tribe";
import Entity from "../Entity";
import ItemEntity from "../ItemEntity";
import LivingEntity from "../LivingEntity";
import Mob from "../mobs/Mob";
import Resource from "../resources/Resource";
import Tribesman from "./Tribesman";
import TribeWorker from "./TribeWorker";

class Warrior extends TribeWorker {
   protected readonly mainAIid = "follow";
   protected readonly terminalVelocity = 2.5;
   protected readonly acceleration = 5;

   public readonly name = "Tribesman";
   public readonly SIZE = 1;

   private static readonly SIGHT_RANGE = 4;
   
   private static readonly MAX_HEALTH = 25;
   private static readonly DEFAULT_SLOT_COUNT = 2;

   private static readonly WANDER_RATE = 0.5;
   private static readonly TARGETS = [Mob, Tribesman, Resource, ItemEntity];
   private static readonly MAX_DIST_FROM_TARGET = 0.5;

   private static readonly ATTACK_RANGE = 2;
   public static readonly ATTACK_INTERVAL = 0.25;

   private attackTimer: Timer | null = null;

   constructor(tribe: Tribe) {
      super(tribe, [
         new AIManagerComponent(),
         new AttackComponent(),
         new FiniteInventoryComponent(Warrior.DEFAULT_SLOT_COUNT)
      ]);

      super.setSightRange(Warrior.SIGHT_RANGE);
      this.getComponent(HealthComponent)!.setMaxHealth(Warrior.MAX_HEALTH, true);

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
            range: Warrior.SIGHT_RANGE,
            terminalVelocity: this.terminalVelocity,
            acceleration: this.acceleration,
            wanderRate: Warrior.WANDER_RATE
         })
      );

      wanderAI.setSwitchCondition({
         newID: "follow",
         shouldSwitch: (): boolean => {
            const entitiesInSearchRadius = followAI.getEntitiesInSearchRadius(transformComponent.position, Warrior.SIGHT_RANGE);
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
            range: Warrior.SIGHT_RANGE,
            targets: Warrior.TARGETS
         })
      );

      let isMovingToStash = false;

      followAI.setSwitchCondition({
         newID: "wander",
         shouldSwitch: (): boolean => {
            if (isMovingToStash) return false;

            const entitiesInSearchRadius = followAI.getEntitiesInSearchRadius(transformComponent.position, Warrior.SIGHT_RANGE);
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
         // If inventory is full, move to the stash
         if (this.getComponent(FiniteInventoryComponent)!.isFull(false)) {
            const targetPosition = this.tribe.position;
            followAI.moveToPosition(targetPosition, this.terminalVelocity, this.acceleration);

            return;
         }

         const target = followAI.getTarget();
         // Don't follow a target that doesn't exist
         if (target === null) return;

         if (target instanceof LivingEntity || target instanceof Tribesman) {
            const targetSize = typeof target.SIZE === "number" ? target.SIZE : (target.SIZE.WIDTH + target.SIZE.HEIGHT) / 2;

            const thisTransformComponent = this.getComponent(TransformComponent)!;
            const targetTransformComponent = target.getComponent(TransformComponent)!;

            // Don't move to the target if they're too close
            const dist = thisTransformComponent.position.distanceFrom(targetTransformComponent.position);
            if (dist - (this.SIZE/2 + targetSize/2) * Board.tileSize < Warrior.MAX_DIST_FROM_TARGET * Board.tileSize) {
               // Stop moving
               thisTransformComponent.stopMoving();
               this.getComponent(TransformComponent)!.velocity = null;

               // Rotate to face the target
               const angle = thisTransformComponent.position.angleBetween(targetTransformComponent.position);
               thisTransformComponent.rotation = angle;
            } else {
               // If the target isn't too close, move to them
               followAI.moveToEntity(target, this.terminalVelocity, this.acceleration);
            }

            // If the warrior can attack, try to attack
            if (this.attackTimer === null) {
               const distanceFromTarget = this.getComponent(TransformComponent)!.position.distanceFrom(target.getComponent(TransformComponent)!.position);
               // If the distance from the target is close enough, attack it
               if (distanceFromTarget < (Warrior.ATTACK_RANGE + this.SIZE/2 + targetSize/2) * Board.tileSize) {
                  this.attack();
                  
                  this.attackTimer = new Timer({
                     duration: Warrior.ATTACK_INTERVAL,
                     onEnd: () => {
                        this.attackTimer = null;
                     }
                  });
               }
            }
         } else {
            followAI.moveToEntity(target, this.terminalVelocity, this.acceleration);
         }
      });

      followAI.setTargetSortFunction((entities: Array<Entity>) => this.sortFollowTargets(entities));

      this.getComponent(AIManagerComponent)!.changeCurrentAI("wander");
   }

   private sortFollowTargets(entities: Array<Entity>): Array<Entity> | null {
      // Sort the entities by type
      const hostileMobs = new Array<Mob | Tribesman>();
      const otherEntities = new Array<Mob | Resource | ItemEntity>();
      for (const entity of entities) {
         // Other tribe members
         if (entity instanceof Tribesman) {
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
}

export default Warrior;