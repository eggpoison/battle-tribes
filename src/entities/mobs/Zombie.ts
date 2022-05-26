import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import FollowAI from "../../entity-components/ai/FollowAI";
import WanderAI from "../../entity-components/ai/WanderAI";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { BasicCol, Point, randInt, Vector } from "../../utils";
import Entity from "../Entity";
import GenericTribeMember from "../tribe-members/GenericTribeMember";
import Mob from "./Mob";

class Zombie extends Mob {
   public readonly SIZE = 1;

   private static readonly HEALTH = 15;

   private static readonly WANDER_SPEED = 0.4;
   private static readonly FOLLOW_SPEED = 1.5;
   private static readonly VISION_RANGE = 4;
   private static readonly WANDER_RATE = 0.25
   private static readonly TARGETS = [GenericTribeMember];

   private static readonly ATTACK_DAMAGE = 4;
   private static readonly KNOCKBACK = 1;

   constructor(position: Point) {
      super(position, [
         new AIManagerComponent()
      ]);

      this.getComponent(HealthComponent)!.setMaxHealth(Zombie.HEALTH, true);

      this.createAI();
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      const EYE_SIZE = 0.3;
      const PUPIL_SIZE = 0.1;
      const EYE_ANGLE_APART = 15;

      const eyeDarkness = randInt(0, 5);
      const eyeColour = new BasicCol(randInt(7, 9), eyeDarkness, eyeDarkness).getCode();

      renderComponent.addPart(new EllipseRenderPart({
         type: "ellipse",
         size: {
            radius: this.SIZE / 2
         },
         fillColour: "#098a00",
         border: {
            width: 5,
            colour: "#000"
         }
      }));

      // Eyes
      for (let i = 0; i < 2; i++) {
         const dir = i === 0 ? -1 : 1;
         const offset = new Vector(this.SIZE / 2, EYE_ANGLE_APART * dir).convertToPoint();

         // Main part
         renderComponent.addParts([
            new EllipseRenderPart({
               type: "ellipse",
               size: {
                  radius: EYE_SIZE / 2
               },
               fillColour: eyeColour,
               border: {
                  width: 5,
                  colour: "#000"
               },
               offset: [-offset.x, -offset.y],
               zIndex: 1
            }),
            // Pupil
            new EllipseRenderPart({
               type: "ellipse",
               size: {
                  radius: PUPIL_SIZE / 2
               },
               fillColour: "#000",
               offset: [-offset.x, -offset.y],
               zIndex: 2
            })
         ])
      }
   }

   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }

   private createAI(): void {
      const transformComponent = this.getComponent(TransformComponent)!;

      const wanderAI = this.getComponent(AIManagerComponent)!.addAI(
         new WanderAI("wander", {
            range: Zombie.VISION_RANGE,
            speed: Zombie.WANDER_SPEED,
            wanderRate: Zombie.WANDER_RATE
         })
      );
      wanderAI.setSwitchCondition({
         newID: "follow",
         shouldSwitch: (): boolean => {
            const entitiesInSearchRadius = wanderAI.getEntitiesInSearchRadius(transformComponent.position, Zombie.VISION_RANGE, Zombie.TARGETS);

            return entitiesInSearchRadius !== null;
         }
      });

      const followAI = this.getComponent(AIManagerComponent)!.addAI(
         new FollowAI("follow", {
            range: Zombie.VISION_RANGE,
            speed: Zombie.FOLLOW_SPEED,
            targets: Zombie.TARGETS
         })
      );
      followAI.setSwitchCondition({
         newID: "wander",
         shouldSwitch: (): boolean => {
            const entitiesInSearchRadius = wanderAI.getEntitiesInSearchRadius(transformComponent.position, Zombie.VISION_RANGE, Zombie.TARGETS);

            return entitiesInSearchRadius === null;
         },
         onSwitch: (): void => {
            transformComponent.stopMoving();
         }
      });

      this.getComponent(AIManagerComponent)!.changeCurrentAI("wander");
   }

   duringCollision(collidingEntity: Entity): void {
      let canHit = false;
      for (const target of Zombie.TARGETS) {
         if (collidingEntity instanceof target) {
            canHit = true;
            break;
         }
      }

      if (canHit) {
         collidingEntity.getComponent(HealthComponent)!.hurt(Zombie.ATTACK_DAMAGE, this, Zombie.KNOCKBACK);
      }
   }
}

export default Zombie;