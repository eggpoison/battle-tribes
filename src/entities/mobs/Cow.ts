import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import  { ItemName } from "../../items/items";
import { TileKind } from "../../data/tile-types";
import { Point, Vector } from "../../utils";
import Mob from "./Mob";
import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import WanderAI from "../../entity-components/ai/WanderAI";
import HealthComponent from "../../entity-components/HealthComponent";
import Entity, { RenderLayer } from "../Entity";
import FollowAI from "../../entity-components/ai/FollowAI";
import Berry from "../resources/Berry";
import TransformComponent from "../../entity-components/TransformComponent";
import ItemEntity from "../ItemEntity";
import CustomAI from "../../entity-components/ai/CustomAI";
import Board from "../../Board";

class Cow extends Mob {
   public readonly name = "Cow";

   public readonly preferredTileTypes: ReadonlyArray<TileKind> = [
      TileKind.grass
   ];

   public readonly SIZE = {
      WIDTH: 1.5,
      HEIGHT: 1
   };

   private static readonly MAX_HEALTH = 15;

   private static readonly WANDER_SPEED = 0.75;
   private static readonly FOLLOW_SPEED = 1.5;
   private static readonly ESCAPE_SPEED = 3.1; // Slightly slower than the player - annoying but not impossible to catch
   private static readonly ACCELERATION = 3;

   private static readonly TARGETS = [Berry, ItemEntity];

   constructor(position: Point) {
      super(RenderLayer.PeacefulEntities, position, [
         new ItemSpawnComponent(),
         new AIManagerComponent()
      ]);

      this.getComponent(HealthComponent)!.setMaxHealth(Cow.MAX_HEALTH, true);

      this.createAI();

      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.meat, [1, 2], "deathByEntity");
      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.leather, [0, 1], "deathByEntity");
   }

   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "rectangle",
         width: this.SIZE.WIDTH,
         height: this.SIZE.HEIGHT
      });
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      const EYE_SIZE = 0.2;
      const EYE_OFFSET = 0.2;
      const EYE_POS = 0.35;

      // Create the main parts of the cow
      renderComponent.addParts([
         // Main body
         new EllipseRenderPart({
            fillColour: "#8c3a00",
            offset: [-0.2, 0],
            size: {
               radius: [this.SIZE.WIDTH / 2, this.SIZE.HEIGHT / 2]
            },
            border: {
               width: 4,
               colour: "#000"
            },
            zIndex: 1
         }),
         // Head
         new EllipseRenderPart({
            fillColour: "#b57910",
            offset: [0.3, 0],
            size: {
               radius: [this.SIZE.HEIGHT / 2.5, this.SIZE.HEIGHT / 2]
            },
            border: {
               width: 4,
               colour: "#000"
            },
            zIndex: 2
         })
      ]);

      // Create the cow's eyes
      for (let i = 0; i < 2; i++) {
         const multipier = i === 0 ? -1 : 1;

         renderComponent.addParts([
            // Eye
            new EllipseRenderPart({
               fillColour: "#fff",
               offset: [EYE_POS, EYE_OFFSET * multipier],
               size: {
                  radius: EYE_SIZE / 2
               },
               border: {
                  width: 2,
                  colour: "#000"
               },
               zIndex: 3
            }),
            // Pupil
            new EllipseRenderPart({
               fillColour: "#000",
               offset: [EYE_POS, EYE_OFFSET * multipier],
               size: {
                  radius: EYE_SIZE / 4
               },
               zIndex: 4
            }),
         ]);
      }
   }

   private createAI(): void {
      const aiManagerComponent = this.getComponent(AIManagerComponent)!;
      const transformComponent = this.getComponent(TransformComponent)!;

      const WANDER_CHANCE = 0.3;
      const WANDER_RANGE = 2;
      const SIGHT_RANGE = 4;

      const wanderAI = aiManagerComponent.addAI(
         new WanderAI("wander", {
            range: WANDER_RANGE,
            terminalVelocity: Cow.WANDER_SPEED,
            acceleration: Cow.ACCELERATION,
            wanderRate: WANDER_CHANCE
         })
      );
      // Set the wander AI as the default AI
      aiManagerComponent.changeCurrentAI("wander");

      const followAI = aiManagerComponent.addAI(
         new FollowAI("follow", {
            range: SIGHT_RANGE,
            targets: Cow.TARGETS
         })
      );

      wanderAI.setSwitchCondition({
         newID: "follow",
         shouldSwitch: (): boolean => {
            const entitiesInRange = followAI.getEntitiesInSearchRadius(transformComponent.position, SIGHT_RANGE);
            return entitiesInRange !== null;
         }
      });

      followAI.addTickCallback(() => {
         const targetEntity = followAI.getTarget();

         if (targetEntity !== null) {
            const targetPosition = targetEntity.getComponent(TransformComponent)!.position;

            // Move to the target
            followAI.moveToPosition(targetPosition, Cow.FOLLOW_SPEED, Cow.ACCELERATION);
            followAI.target = targetEntity;
         }
      });

      followAI.setSwitchCondition({
         newID: "wander",
         shouldSwitch: (): boolean => {
            const entitiesInRange = followAI.getEntitiesInSearchRadius(transformComponent.position, SIGHT_RANGE);
            return entitiesInRange === null;
         }
      });

      followAI.setTargetSortFunction(this.sortTargets);

      let attackingEntity!: Entity;

      const customAI = aiManagerComponent.addAI(
         new CustomAI("custom")
      );

      this.createEvent("hurt", ([ _damage, entity ]: [number, Entity]) => {
         // When the cow is hit by an entity, run away from that entity
         if (entity !== null) {
            attackingEntity = entity;
            aiManagerComponent.changeCurrentAI("custom");

            transformComponent.terminalVelocity = Cow.ESCAPE_SPEED
         }
      });

      customAI.addTickCallback(() => {
         const attackingEntityPosition = attackingEntity.getComponent(TransformComponent)!.position;
         const cowPosition = this.getComponent(TransformComponent)!.position;

         // Make sure the attacking entity is still in range
         const distBetween = cowPosition.distanceFrom(attackingEntityPosition);
         if (distBetween <= SIGHT_RANGE * Board.tileSize) {  
            // Get the angle away from the entity
            const angle = cowPosition.angleBetween(attackingEntityPosition);
            const flippedAngle = angle + Math.PI;
            
            // Move away from the entity
            const movementVector = new Vector(Cow.ACCELERATION, flippedAngle);
            customAI.move(movementVector);
         } else {
            // If the attacking entity is out of range, go back to regular behaviour
            aiManagerComponent.changeCurrentAI("wander");
            transformComponent.isMoving = false;
            transformComponent.acceleration = null;
         }
      });
   }

   private sortTargets(entities: Array<Entity>): Array<Entity> | null {
      const sortedEntities = new Array<Entity>();

      // Filter out item entities which aren't berries
      for (const entity of entities) {
         if (entity instanceof ItemEntity && entity.item.displayName !== "Berry") continue;

         sortedEntities.push(entity);
      }

      return sortedEntities;
   }

   public duringCollision(entity: Entity): void {
      if (entity instanceof Berry) {
         entity.getComponent(HealthComponent)!.hurt(1, this, 0.4);
      } else if (entity instanceof ItemEntity && entity.item.displayName === "Berry") {
         entity.destroy();
      }
   }
}

export default Cow;