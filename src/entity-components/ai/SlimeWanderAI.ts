import Board from "../../Board";
import SETTINGS from "../../settings";
import Timer from "../../Timer";
import { Point, randFloat, Vector } from "../../utils";
import TransformComponent from "../TransformComponent";
import WanderAI from "./WanderAI";

class SlimeWanderAI extends WanderAI {
   private hasTimer: boolean = false;

   private readonly wanderRate: [number, number];

   constructor(wanderRate: [number, number], wanderRange: number, wanderSpeed: number) {
      super(null, wanderRange, wanderSpeed);

      this.wanderRate = wanderRate;
   }

   private leap(targetPosition: Point): void {
      const transformComponent = this.entity.getComponent(TransformComponent)!;

      const dist = transformComponent.position.distanceFrom(targetPosition);
      const angle = targetPosition.angleBetween(transformComponent.position);

      const leapTime = dist / Board.tileSize / this.wanderSpeed;

      const velocity = new Vector(this.wanderSpeed * Board.tileSize / SETTINGS.tps, angle);
      transformComponent.setVelocity(velocity);

      new Timer(leapTime, () => {
         if (!this.isActive()) return;

         transformComponent.stopVelocity();
      });
   }

   public tick(): void {
      if (!this.hasTimer) {
         this.hasTimer = true;

         const timerDuration = randFloat(...this.wanderRate);

         new Timer(timerDuration, () => {
            if (!this.isActive()) return;

            const targetPosition = super.getWanderTarget();
            this.leap(targetPosition);

            this.hasTimer = false;
         })
      };
   }
}

export default SlimeWanderAI;