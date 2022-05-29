import Entity from "../../entities/Entity";
import { ConstructorFunction } from "../../utils";
import HealthComponent from "../HealthComponent";
import TransformComponent from "../TransformComponent";
import EntityAI from "./EntityAI";

type FollowAIInfo = {
   readonly range: number;
   readonly targets: ReadonlyArray<ConstructorFunction>;
}

class FollowAI extends EntityAI {
   public readonly id: string;

   public target: Entity | null = null;

   private readonly range: number;
   private readonly targets: ReadonlyArray<ConstructorFunction>;

   constructor(id: string, info: FollowAIInfo) {
      super();

      this.id = id;

      this.range = info.range;
      this.targets = info.targets;
   }

   protected reachTargetPosition(transformComponent: TransformComponent): void {
      super.reachTargetPosition(transformComponent);

      this.target = null;
   }

   public getTarget(): Entity | null {
      const transformComponent = this.entity.getComponent(TransformComponent)!;

      let entitiesInSearchRadius = super.getEntitiesInSearchRadius(transformComponent.position, this.range, this.targets);
      if (entitiesInSearchRadius === null) return null;

      if (typeof this.targetSortFunction !== "undefined") {
         entitiesInSearchRadius = this.targetSortFunction(entitiesInSearchRadius);
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

   public moveToEntity(entity: Entity, speed: number): void {
      const position = entity.getComponent(TransformComponent)!.position;
      super.moveToPosition(position, speed);
   }

   private targetSortFunction?: (entities: Array<Entity>) => Array<Entity> | null;
   public setTargetSortFunction(func: (entities: Array<Entity>) => Array<Entity> | null): void {
      this.targetSortFunction = func;
   }

   private tickCallback?: () => void;
   public setTickCallback(callback: () => void): void {
      this.tickCallback = callback;
   }

   private validateTarget(): void {
      if (this.target === null) return;
      
      // Untarget the target if it is dead
      const healthComponent = this.target.getComponent(HealthComponent);
      if (healthComponent !== null) {
         if (healthComponent.getHealth() <= 0) {
            this.target = null;
         }
      }
   }

   public tick(): void {
      super.tick();

      // Make sure the target isn't dead
      this.validateTarget();

      if (typeof this.tickCallback !== "undefined") this.tickCallback();
   }
}

export default FollowAI;