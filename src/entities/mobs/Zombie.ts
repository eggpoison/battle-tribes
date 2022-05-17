import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import FollowAI from "../../entity-components/ai/FollowAI";
import WanderAI from "../../entity-components/ai/WanderAI";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import { Point } from "../../utils";
import GenericTribeMember from "../tribe-members/GenericTribeMember";
import Mob from "./Mob";

class Zombie extends Mob {
   public readonly SIZE = 1;

   private static readonly SPEED = 1.2;
   private static readonly VISION_RANGE = 4;
   private static readonly WANDER_RATE = 0.25
   private static readonly TARGETS = [GenericTribeMember];

   constructor(position: Point) {
      super(position, [
         new AIManagerComponent()
      ]);

      this.createAI();
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
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
   }

   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }

   private createAI(): void {
      this.getComponent(AIManagerComponent)!.addAI(
         new WanderAI("wander", {
            range: Zombie.VISION_RANGE,
            speed: Zombie.SPEED,
            wanderRate: Zombie.WANDER_RATE
         })
      );

      this.getComponent(AIManagerComponent)!.addAI(
         new FollowAI("follow", {
            range: Zombie.VISION_RANGE,
            speed: Zombie.SPEED,
            targets: Zombie.TARGETS
         })
      );

      this.getComponent(AIManagerComponent)!.changeCurrentAI("wander");
   }
}

export default Zombie;