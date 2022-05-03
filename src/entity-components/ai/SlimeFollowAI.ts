import Timer from "../../Timer";
import { Point, randFloat } from "../../utils";
import TransformComponent from "../TransformComponent";
import FollowAI from "./FollowAI";

class SlimeFollowAI extends FollowAI {
   private canMove: boolean = true;

   public shouldSwitch(): boolean {
      const closestEntity = super.findClosestEntity();
      return closestEntity !== null;
   }

   public leap(targetPosition: Point): void {
      this.setTargetPosition(targetPosition);
      super.moveToPosition(targetPosition, this.moveSpeed);

      this.canMove = false;
   }

   protected reachTargetPosition(transformComponent: TransformComponent): void {
      super.reachTargetPosition(transformComponent);

      const duration = randFloat(0.15, 0.3);
      new Timer(duration, () => {
         if (!this.isActive()) return;

         this.canMove = true;
      });
   }

   public tick(): void {
      if (!this.canMove) return;

      const closestEntity = super.findClosestEntity();

      if (closestEntity !== null) {
         const targetPosition = closestEntity.getComponent(TransformComponent)!.position;

         this.leap(targetPosition);
      } else {
         super.changeCurrentAI("wander");
      }
   }
}

export default SlimeFollowAI;