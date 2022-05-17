import FollowAI from "../../entity-components/ai/FollowAI";
import WanderAI from "../../entity-components/ai/WanderAI";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import { Point } from "../../utils";
import Mob from "./Mob";

class Yeti extends Mob {
   public readonly SIZE = 2;

   private static readonly WALK_SPEED = 1.25;
   private static readonly RUN_SPEED = 2.5;

   constructor(position: Point) {
      const WANDER_CHANCE = 0.5;
      const WANDER_RANGE = 4;
      
      super(position, [
         // new WanderAI(WANDER_CHANCE, WANDER_RANGE, Yeti.WALK_SPEED),
         // new FollowAI()
      ]);
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
}

export default Yeti;