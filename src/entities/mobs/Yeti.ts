import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import FollowAI from "../../entity-components/ai/FollowAI";
import WanderAI from "../../entity-components/ai/WanderAI";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { Point } from "../../utils";
import Entity, { RenderLayer } from "../Entity";
import Tribesman from "../tribe-members/Tribesman";
import Mob from "./Mob";

// TODO: Leave trail of snow behind
// TODO: Smash attack

class Yeti extends Mob {
   public readonly name = "Yeti";
   public readonly SIZE = 3;

   private static readonly HEALTH = 250;

   private static readonly ATTACK_DAMAGE = 7.5;
   private static readonly KNOCKBACK = 1.5;

   private static readonly WANDER_TERMINAL_VELOCITY = 1.25;
   private static readonly FOLLOW_TERMINAL_VELOCITY = 3.5;
   private static readonly ACCELERATION = 5;
   
   private static readonly VISION_RANGE = 5;
   private static readonly WANDER_RATE = 0.25;
   private static readonly TARGETS = [Tribesman];

   constructor(position: Point) {
      super(RenderLayer.HostileEntities, position, [
         new AIManagerComponent()
      ]);

      this.getComponent(HealthComponent)!.setMaxHealth(Yeti.HEALTH, true);

      this.createAI();
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      renderComponent.addPart(new EllipseRenderPart({
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
      const aiManagerComponent = this.getComponent(AIManagerComponent)!;
      const transformComponent = this.getComponent(TransformComponent)!;

      const wanderAI = aiManagerComponent.addAI(
         new WanderAI("wander", {
            range: Yeti.VISION_RANGE,
            terminalVelocity: Yeti.WANDER_TERMINAL_VELOCITY,
            acceleration: Yeti.ACCELERATION,
            wanderRate: Yeti.WANDER_RATE
         })
      );
      this.getComponent(AIManagerComponent)!.changeCurrentAI("wander");

      wanderAI.setSwitchCondition({
         newID: "follow",
         shouldSwitch: (): boolean => {
            const entitiesInSearchRadius = followAI.getEntitiesInSearchRadius(transformComponent.position, Yeti.VISION_RANGE + this.SIZE/2);

            return entitiesInSearchRadius !== null;
         }
      });

      const followAI = aiManagerComponent.addAI(
         new FollowAI("follow", {
            range: Yeti.VISION_RANGE,
            targets: Yeti.TARGETS
         })
      );

      followAI.addTickCallback(() => {
         const target = followAI.getTarget();

         // Move to the target
         if (target !== null) {
            followAI.moveToPosition(target.getComponent(TransformComponent)!.position, Yeti.FOLLOW_TERMINAL_VELOCITY, Yeti.ACCELERATION);
            transformComponent.terminalVelocity = Yeti.FOLLOW_TERMINAL_VELOCITY;
         } else {
            // If a target can't be found, switch to wander AI
            aiManagerComponent.changeCurrentAI("wander");
            transformComponent.terminalVelocity = Yeti.WANDER_TERMINAL_VELOCITY;
         }
      });
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