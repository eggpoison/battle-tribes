import Entity from "../../entities/Entity";
import { ConstructorFunction } from "../../utils";
import HealthComponent from "../HealthComponent";
import TransformComponent from "../TransformComponent";
import EntityAI from "./EntityAI";

type FollowAIInfo = {
   readonly range: number;
   readonly speed: number;
   readonly targets: ReadonlyArray<ConstructorFunction>;
}

class FollowAI extends EntityAI {
   public readonly id: string;

   public target: Entity | null = null;

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

   protected reachTargetPosition(transformComponent: TransformComponent): void {
      super.reachTargetPosition(transformComponent);

      this.target = null;
   }

   protected findClosestEntity(): Entity | null {
      const transformComponent = this.entity.getComponent(TransformComponent)!;

      let entitiesInSearchRadius = super.getEntitiesInSearchRadius(transformComponent.position, this.range, this.targets);
      if (entitiesInSearchRadius === null) return null;

      if (typeof this.customSortFunction !== "undefined") {
         entitiesInSearchRadius = this.customSortFunction(entitiesInSearchRadius);
         if (entitiesInSearchRadius === null) return null;
      }

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

   private customSortFunction?: (entities: Array<Entity>) => Array<Entity> | null;
   public createSortFunction(func: (entities: Array<Entity>) => Array<Entity> | null): void {
      this.customSortFunction = func;
   }

   private tickCondition?: () => boolean;
   public setTickCondition(condition: () => boolean): void {
      this.tickCondition = condition;
   }

   private validateTarget(): void {
      if (this.target === null) return;
      
      const healthComponent = this.target.getComponent(HealthComponent);
      if (healthComponent !== null) {
         if (healthComponent.getHealth() <= 0) {
            this.target = null;
         }
      }
   }

   public tick(): void {
      super.tick();
      this.validateTarget();
      if (typeof this.tickCondition !== "undefined" && !this.tickCondition()) return;


      const targetEntity = this.findClosestEntity();

      if (targetEntity !== null) {
         const targetPosition = targetEntity.getComponent(TransformComponent)!.position;

         // Move to the target
         super.moveToPosition(targetPosition, this.speed);
         
         this.target = targetEntity;
      }
   } 
}

export default FollowAI;