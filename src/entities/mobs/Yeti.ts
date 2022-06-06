import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import FollowAI from "../../entity-components/ai/FollowAI";
import WanderAI from "../../entity-components/ai/WanderAI";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { Point } from "../../utils";
import Entity from "../Entity";
import GenericTribeMember from "../tribe-members/GenericTribeMember";
import Mob from "./Mob";

// TODO: Leave trail of snow behind
// TODO: Smash attack

class Yeti extends Mob {
   public readonly name = "Yeti";
   public readonly SIZE = 3;

   private static readonly HEALTH = 250;

   private static readonly ATTACK_DAMAGE = 7.5;
   private static readonly KNOCKBACK = 1.5;

   private static readonly WANDER_SPEED = 1.25;
   private static readonly FOLLOW_SPEED = 3;
   
   private static readonly VISION_RANGE = 5;
   private static readonly WANDER_RATE = 0.25;
   private static readonly TARGETS = [GenericTribeMember];

   constructor(position: Point) {
      super(position, [
         new AIManagerComponent()
      ]);

      this.setMaxHealth(Yeti.HEALTH);

      this.createAI();
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      renderComponent.addPart(new EllipseRenderPart({
         type: "ellipse",
         size: {
            radius: this.SIZE / 2
         },
         fillColour: "#fff",
         border: {
            width: 5,
            colour: "#000"
         }
      }));
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
            range: Yeti.VISION_RANGE,
            speed: Yeti.WANDER_SPEED,
            wanderRate: Yeti.WANDER_RATE
         })
      );
      wanderAI.setSwitchCondition({
         newID: "follow",
         shouldSwitch: (): boolean => {
            const entitiesInSearchRadius = wanderAI.getEntitiesInSearchRadius(transformComponent.position, Yeti.VISION_RANGE + this.SIZE/2, Yeti.TARGETS);

            return entitiesInSearchRadius !== null;
         }
      });

      const followAI = this.getComponent(AIManagerComponent)!.addAI(
         new FollowAI("follow", {
            range: Yeti.VISION_RANGE,
            targets: Yeti.TARGETS
         })
      );
      followAI.setSwitchCondition({
         newID: "wander",
         shouldSwitch: (): boolean => {
            const entitiesInSearchRadius = wanderAI.getEntitiesInSearchRadius(transformComponent.position, Yeti.VISION_RANGE + this.SIZE/2, Yeti.TARGETS);

            return entitiesInSearchRadius === null;
         },
         onSwitch: (): void => {
            transformComponent.stopMoving();
         }
      });

      followAI.addTickCallback(() => {
         const target = followAI.getTarget();

         // Move to the target
         if (target !== null) {
            followAI.moveToPosition(target.getComponent(TransformComponent)!.position, Yeti.FOLLOW_SPEED);
         }
      })

      this.getComponent(AIManagerComponent)!.changeCurrentAI("wander");
   }

   duringCollision(collidingEntity: Entity): void {
      let canHit = false;
      for (const target of Yeti.TARGETS) {
         if (collidingEntity instanceof target) {
            canHit = true;
            break;
         }
      }

      if (canHit && collidingEntity.getComponent(HealthComponent) !== null) {
         collidingEntity.getComponent(HealthComponent)!.hurt(Yeti.ATTACK_DAMAGE, this, Yeti.KNOCKBACK);
      }
   }
}

export default Yeti;