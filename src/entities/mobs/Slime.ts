import Board from "../../Board";
import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import SlimeFollowAI from "../../entity-components/ai/SlimeFollowAI";
import SlimeWanderAI from "../../entity-components/ai/SlimeWanderAI";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import { ItemName } from "../../items/items";
import { MobBehaviour } from "../../entity-info";
import { ConstructorFunction, Point, randInt, Vector } from "../../utils";
import Entity, { EventType } from "../Entity";
import GenericTribeMember from "../tribe-members/GenericTribeMember";
import Mob from "./Mob";
import TransformComponent from "../../entity-components/TransformComponent";

enum SlimeSizeCategory {
   small,
   medium,
   large,
   colossal
}

type SlimeInfo = {
   readonly size: number;
   readonly health: number;
   readonly wanderRange: number;
   readonly slimeDrop: number | [number, number];
   readonly splitChance: number;
}

const SLIME_INFO: Record<SlimeSizeCategory, SlimeInfo> = {
   [SlimeSizeCategory.small]: {
      size: 0.6,
      health: 10,
      wanderRange: 1,
      slimeDrop: [0, 1],
      splitChance: 0
   },
   [SlimeSizeCategory.medium]: {
      size: 1,
      health: 20,
      wanderRange: 2,
      slimeDrop: 1,
      splitChance: 0.6
   },
   [SlimeSizeCategory.large]: {
      size: 1.5,
      health: 30,
      wanderRange: 3,
      slimeDrop: [1, 2],
      splitChance: 0.8
   },
   [SlimeSizeCategory.colossal]: {
      size: 2.5,
      health: 50,
      wanderRange: 4,
      slimeDrop: [2, 3],
      splitChance: 1
   }
}

class Slime extends Mob {
   public readonly SIZE: number;

   private static readonly COLOUR = "#00d432";
   private static readonly DAMAGE = 5;
   private static readonly KNOCKBACK_STRENGTH = 10;

   private readonly info: SlimeInfo;

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
      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.slime, slimeDrops, EventType.deathByEntity);
   }

   private createAI(): void {
      const WANDER_RATE: [number, number] = [2, 3.5];
      const WANDER_SPEED = 1.5;

      const SEARCH_RANGE = 4;
      const FOLLOW_SPEED = 5;

      const validEntityConstr: ReadonlyArray<ConstructorFunction> = [GenericTribeMember];

      this.getComponent(AIManagerComponent)!.addAI(
         new SlimeWanderAI(WANDER_RATE, this.info.wanderRange, WANDER_SPEED)
      );
      this.getComponent(AIManagerComponent)!.addAI(
         new SlimeFollowAI(SEARCH_RANGE, FOLLOW_SPEED, validEntityConstr)
      );

      this.getComponent(AIManagerComponent)!.setCurrentAIType("wander");
   }

   protected onCollision(entity: Entity): void {
      // Don't attack fellow hostile mobs
      if (entity instanceof Mob && entity.entityInfo.behaviour === MobBehaviour.hostile) return;

      const healthCompoment = entity.getComponent(HealthComponent);
      if (healthCompoment !== null) {
         healthCompoment.hurt(Slime.DAMAGE, this, Slime.KNOCKBACK_STRENGTH);
      }
   }

   public onDie(causeOfDeath: Entity | null): void {
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

      super.onDie(causeOfDeath);
   }
}

export default Slime;