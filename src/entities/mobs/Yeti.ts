import FollowAI from "../../entity-components/ai/FollowAI";
import WanderAI from "../../entity-components/ai/WanderAI";
import HitboxComponent from "../../entity-components/HitboxComponent";
import MOB_INFO_RECORD, { MobInfo } from "../../mob-info";
import { Point } from "../../utils";
import Mob from "./Mob";

class Yeti extends Mob {
   private static readonly SIZE = 2;
   private static readonly WALK_SPEED = 1.25;
   private static readonly RUN_SPEED = 2.5;

   constructor(position: Point) {
      const WANDER_CHANCE = 0.5;
      const WANDER_RANGE = 4;
      
      super(position, [
         // new WanderAI(WANDER_CHANCE, WANDER_RANGE, Yeti.WALK_SPEED),
         // new FollowAI()
      ]);

      this.createHitbox();
   }

   public getInfo(): MobInfo {
      return MOB_INFO_RECORD.yeti;
   }

   private createHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: Yeti.SIZE / 2
      });
   }
}

export default Yeti;