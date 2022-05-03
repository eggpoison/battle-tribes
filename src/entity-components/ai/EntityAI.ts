import Board from "../../Board";
import Mob from "../../entities/mobs/Mob";
import SETTINGS from "../../settings";
import { Point, Vector } from "../../utils";
import TransformComponent from "../TransformComponent";
import AIManagerComponent from "./AIManangerComponent";

export type AIType = "wander" | "search";

export interface AIInfo {
   readonly type: AIType;
}

abstract class EntityAI implements AIInfo {
   public readonly type: AIType;

   protected entity!: Mob;

   private targetPosition: Point | null = null;

   constructor(type: AIType) {
      this.type = type;
   }

   public setEntity(entity: Mob): void {
      this.entity = entity;
   }

   public abstract tick(): void;

   public shouldSwitch?(): boolean;

   public checkTargetPosition(): void {
      if (this.targetPosition !== null) {
         const transformComponent = this.entity.getComponent(TransformComponent)!;

         const relativeTargetPos = transformComponent.position.subtract(this.targetPosition);

         const dotProduct = transformComponent.velocity.convertToPoint().dot(relativeTargetPos);
         if (dotProduct > 0) {
            this.reachTargetPosition(transformComponent);
         }
      }
   }

   protected reachTargetPosition(transformComponent: TransformComponent): void {
      this.targetPosition = null;

      transformComponent.stopVelocity();
   }

   protected setTargetPosition(position: Point): void {
      this.targetPosition = position;
   }

   protected moveToPosition(position: Point, speed: number): void {
      this.targetPosition = position;

      const transformComponent = this.entity.getComponent(TransformComponent)!;

      const angle = transformComponent.position.angleBetween(position);
      const targetVector = new Vector(speed * Board.tileSize / SETTINGS.tps, angle);

      transformComponent.rotation = angle;

      transformComponent.setVelocity(targetVector);
   }

   protected changeCurrentAI(newAIType: AIType): void {
      this.entity.getComponent(AIManagerComponent)!.setCurrentAIType(newAIType);
   }

   protected isActive(): boolean {
      return this.entity.getComponent(AIManagerComponent)!.getCurrentAI() === this;
   }
}

export default EntityAI;