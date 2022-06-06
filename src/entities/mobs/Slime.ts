import Board from "../../Board";
import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import { ItemName } from "../../items/items";
import { Point, randFloat, randInt, Vector } from "../../utils";
import Entity from "../Entity";
import GenericTribeMember from "../tribe-members/GenericTribeMember";
import Mob from "./Mob";
import TransformComponent from "../../entity-components/TransformComponent";
import WanderAI from "../../entity-components/ai/WanderAI";
import FollowAI from "../../entity-components/ai/FollowAI";
import Timer from "../../Timer";
import SETTINGS from "../../settings";

enum SlimeSizeCategory {
   small,
   medium,
   large,
   colossal
}

type SlimeInfo = {
   readonly size: number;
   readonly health: number;
   readonly searchRange: number;
   readonly slimeDrop: number | [number, number];
   readonly splitChance: number;
}

const SLIME_INFO: Record<SlimeSizeCategory, SlimeInfo> = {
   [SlimeSizeCategory.small]: {
      size: 0.6,
      health: 10,
      searchRange: 3,
      slimeDrop: [0, 1],
      splitChance: 0
   },
   [SlimeSizeCategory.medium]: {
      size: 1,
      health: 20,
      searchRange: 3,
      slimeDrop: 1,
      splitChance: 0.6
   },
   [SlimeSizeCategory.large]: {
      size: 1.5,
      health: 30,
      searchRange: 4,
      slimeDrop: [1, 2],
      splitChance: 0.8
   },
   [SlimeSizeCategory.colossal]: {
      size: 2.5,
      health: 50,
      searchRange: 5,
      slimeDrop: [2, 3],
      splitChance: 1
   }
}

class Slime extends Mob {
   public readonly name = "Slime";
   public readonly SIZE: number;

   private readonly info: SlimeInfo;

   private static readonly COLOUR = "#00d432";
   private static readonly DAMAGE = 5;
   private static readonly KNOCKBACK_STRENGTH = 1;

   // AI
   private static readonly FOLLOW_WAIT_TIMER_DURATION = 0.4;
   private static readonly FOLLOW_WAIT_TIMER_DURATION_VARIANCE = 0.1;
   private followWaitTimer: Timer | null = new Timer({ duration: 1, onEnd: () => this.followWaitTimer = null });
   
   private static readonly TARGETS = [GenericTribeMember];

   private static readonly FOLLOW_SPEED = 5;
   private static readonly FOLLOW_SPEED_VARIANCE = 0.3;

   constructor(position: Point, size?: SlimeSizeCategory) {
      super(position, [
         new ItemSpawnComponent(),
         new AIManagerComponent()
      ]);

      // Generate a size category
      if (typeof size !== "undefined") {
         this.info = SLIME_INFO[size];
      } else {
         let sizeCategory: SlimeSizeCategory = 0;
         while (sizeCategory < 3) {
            if (Math.random() < 0.5 - sizeCategory / 10) {
               sizeCategory++;
            } else {
               break;
            }
         }

         this.info = SLIME_INFO[sizeCategory];
      }
      this.SIZE = this.info.size;

      super.setMaxHealth(this.info.health);

      this.addItemDrops();

      this.createAI();
   }

   private getSize(): number {
      for (const [size, info] of Object.entries(SLIME_INFO)) {
         if (info === this.info) return Number(size);
      }

      throw new Error("Can't find slime size");
   }

   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }

   protected createRenderParts(): void {
      this.getComponent(RenderComponent)!.addPart(
         new EllipseRenderPart({
            type: "ellipse",
            size: {
               radius: this.SIZE / 2
            },
            fillColour: Slime.COLOUR,
            border: {
               width: 5,
               colour: "#000"
            }
         })
      );
   }

   private addItemDrops(): void {
      const slimeDrops = typeof this.info.slimeDrop === "number" ? this.info.slimeDrop : randInt(...this.info.slimeDrop);
      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.slime, slimeDrops, "deathByEntity");
   }

   private createAI(): void {
      const transformComponent = this.getComponent(TransformComponent)!;

      const WANDER_RATE = 1;
      const WANDER_SPEED = 1.5;

      // Wander AI
      const wanderAI = this.getComponent(AIManagerComponent)!.addAI(
         new WanderAI("wander", {
            range: this.info.searchRange,
            speed: WANDER_SPEED,
            wanderRate: WANDER_RATE
         })
      );
      wanderAI.setSwitchCondition({
         newID: "follow",
         shouldSwitch: (): boolean => {
            const entitiesInSearchRadius = wanderAI.getEntitiesInSearchRadius(transformComponent.position, this.info.searchRange, Slime.TARGETS);

            return entitiesInSearchRadius !== null;
         },
         onSwitch: (): void => {
            transformComponent.stopMoving();
         }
      });

      const followAI = this.getComponent(AIManagerComponent)!.addAI(
         new FollowAI("follow", {
            range: this.info.searchRange,
            targets: Slime.TARGETS
         })
      );

      let isMovingToTarget = false;

      followAI.setSwitchCondition({
         newID: "wander",
         shouldSwitch: (): boolean => {
            const entitiesInSearchRadius = wanderAI.getEntitiesInSearchRadius(transformComponent.position, this.info.searchRange, Slime.TARGETS);

            return entitiesInSearchRadius === null;
         },
         onSwitch: (): void => {
            transformComponent.stopMoving();

            this.followWaitTimer = null;

            isMovingToTarget = false;
         }
      });

      followAI.addTickCallback(() => {
         if (this.followWaitTimer === null && !isMovingToTarget) {
            const target = followAI.getTarget();
            if (target === null) return;

            isMovingToTarget = true;

            // Get move speed
            const speed = Slime.FOLLOW_SPEED + randFloat(-Slime.FOLLOW_SPEED_VARIANCE, Slime.FOLLOW_SPEED_VARIANCE);

            // Move to the target
            followAI.moveToPosition(target.getComponent(TransformComponent)!.position, speed);
         }
      });

      // When the target entity is reached, reset the move timer
      followAI.addReachTargetCallback(() => {
         isMovingToTarget = false;

         // Get timer duration
         const duration = Slime.FOLLOW_WAIT_TIMER_DURATION + randFloat(-Slime.FOLLOW_WAIT_TIMER_DURATION_VARIANCE, Slime.FOLLOW_WAIT_TIMER_DURATION_VARIANCE);

         // Reset the timer
         this.followWaitTimer = new Timer({
            duration: duration,
            onEnd: () => {
               this.followWaitTimer = null;
            }
         });
      })

      // Increase the duration of the follow wait timer
      this.createEvent("healthChange", ([healthChange]: [number]) => {
         if (healthChange < 0 && this.followWaitTimer !== null) {
            const MULTIPLIER = randFloat(1, 1.5);
            this.followWaitTimer.addDuration(SETTINGS.entityInvulnerabilityDuration * MULTIPLIER);
         }
      });

      this.getComponent(AIManagerComponent)!.changeCurrentAI("follow");
   }

   protected duringCollision(entity: Entity): void {
      // Only attack targets
      let canHit = false;
      for (const constr of Slime.TARGETS) {
         if (entity instanceof constr) {
            canHit = true;
            break;
         }
      }
      if (!canHit) return;

      const healthCompoment = entity.getComponent(HealthComponent)!;
      healthCompoment.hurt(Slime.DAMAGE, this, Slime.KNOCKBACK_STRENGTH);
   }

   public die(causeOfDeath: Entity | null): void {
      // Split
      if (Math.random() < this.info.splitChance) {
         const thisSize = this.getSize();

         const numChildren = randInt(1, 2);
         for (let i = 0; i < numChildren; i++) {
            const offset = Vector.randomUnitVector();
            offset.magnitude *= this.info.size / 2 * Board.tileSize * Math.random();

            const childSpawnPosition = this.getComponent(TransformComponent)!.position.add(offset.convertToPoint());
            
            const childSlime = new Slime(childSpawnPosition, thisSize - 1);
            childSlime.setInfo(this.entityInfo);
            Board.addEntity(childSlime);
         }
      }

      super.die(causeOfDeath);
   }
}

export default Slime;