import { EventType } from "../../entities/Entity";
import SETTINGS from "../../settings";
import Timer from "../../Timer";
import { Point } from "../../utils";
import TransformComponent from "../TransformComponent";
import FollowAI from "./FollowAI";

class SlimeFollowAI extends FollowAI {
   private canMove: boolean = true;

   private waitTimer: Timer | null = null;

   protected onLoad(): void {
      this.entity.createEvent(EventType.hurt, () => this.getHurt());
   }

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

      this.startWaitTimer();
   }

   private startWaitTimer(): void {
      const DURATION = 0.4;
      this.waitTimer = new Timer(DURATION, () => this.endWaitTimer());
   }

   private endWaitTimer(): void {
      this.waitTimer = null;
      this.canMove = true;
   }

   private getHurt(): void {
      if (this.waitTimer !== null) {
         this.waitTimer.addDuration(SETTINGS.entityInvulnerabilityDuration);
      }
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