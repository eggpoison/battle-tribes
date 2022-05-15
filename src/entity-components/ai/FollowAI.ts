import Board from "../../Board";
import Entity from "../../entities/Entity";
import { ConstructorFunction, Point } from "../../utils";
import TransformComponent from "../TransformComponent";
import EntityAI from "./EntityAI";

type FollowAIInfo = {
   readonly range: number;
   readonly speed: number;
   readonly targets: ReadonlyArray<ConstructorFunction>;
}

class FollowAI extends EntityAI {
   public readonly id: string;

   private readonly range: number;
   private readonly targets: ReadonlyArray<ConstructorFunction>;
   private readonly speed: number;

   constructor(id: string, info: FollowAIInfo) {
      super();

      this.id = id;

      this.range = info.range;
      this.speed = info.speed;
      this.targets = info.targets;
   }

   protected findClosestEntity(): Entity | null {
      const transformComponent = this.entity.getComponent(TransformComponent)!;

      const entitiesInSearchRadius = super.getEntitiesInSearchRadius(transformComponent.position, this.range, this.targets);
      if (entitiesInSearchRadius === null) return null;

      let closestEntity!: Entity;
      let closestDistance: number = Number.MAX_SAFE_INTEGER;
      for (const entity of entitiesInSearchRadius) {
         const dist = transformComponent.position.distanceFrom(entity.getComponent(TransformComponent)!.position);

         if (dist < closestDistance) {
            closestDistance = dist;
            closestEntity = entity;
         }
      }  

      return closestEntity;
   }

   public tick(): void {
      super.tick();

      const targetEntity = this.findClosestEntity();

      if (targetEntity !== null) {
         const targetPosition = targetEntity.getComponent(TransformComponent)!.position;
         super.moveToPosition(targetPosition, this.speed);
      }
   }
}

export default FollowAI;