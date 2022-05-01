import Mob from "../../entities/mobs/Mob";
import { Point, Vector } from "../../utils";
import TransformComponent from "../TransformComponent";

export type AIType = "wander";

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

   public tick(): void {
      if (this.targetPosition !== null) {
         const transformComponent = this.entity.getComponent(TransformComponent)!;

         const relativeTargetPos = transformComponent.position.subtract(this.targetPosition);

         const dotProduct = transformComponent.velocity.convertToPoint().dot(relativeTargetPos);
         if (dotProduct > 0) {
            this.reachTargetPosition(transformComponent);
         }
      }
   }

   private reachTargetPosition(transformComponent: TransformComponent): void {
      this.targetPosition = null;

      transformComponent.setTargetVelocity(new Vector(0, 0));
      transformComponent.velocity = new Vector(0, 0);
   }

   protected moveToPosition(position: Point, speed: number): void {
      this.targetPosition = position;

      const transformComponent = this.entity.getComponent(TransformComponent)!;

      const angle = transformComponent.position.angleBetween(position);
      const targetVector = new Vector(speed, angle);

      transformComponent.rotation = angle;

      transformComponent.setTargetVelocity(targetVector);
      transformComponent.velocity = targetVector;
   }
}

export default EntityAI;