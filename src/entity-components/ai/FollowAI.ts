import Board from "../../Board";
import Entity from "../../entities/Entity";
import { ConstructorFunction, Point } from "../../utils";
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

   public getEntitiesInSearchRadius(position: Point, range: number): Array<Entity> | null {
      let validTargets = Board.getEntitiesInRange(position, range * Board.tileSize);
      if (validTargets === null) return null;

      // If possible sort the entities
      if (typeof this.targetSortFunction !== "undefined") {
         const sortedEntities = this.targetSortFunction(validTargets);
         if (sortedEntities === null) return null;
         validTargets = sortedEntities;
      }

      // Filter the targets to only include targets the entity can pursue
      validTargets = this.filterTargets(validTargets, this.targets);

      if (validTargets.length > 0) return validTargets;
      return null;
   }

   public getTarget(): Entity | null {
      const transformComponent = this.entity.getComponent(TransformComponent)!;

      const entitiesInSearchRadius = this.getEntitiesInSearchRadius(transformComponent.position, this.range);
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

   public moveToEntity(entity: Entity, speed: number, acceleration: number): void {
      const position = entity.getComponent(TransformComponent)!.position;
      super.moveToPosition(position, speed, acceleration);
   }

   private targetSortFunction?: (entities: Array<Entity>) => Array<Entity> | null;
   public setTargetSortFunction(func: (entities: Array<Entity>) => Array<Entity> | null): void {
      this.targetSortFunction = func;
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
   }
}

export default FollowAI;