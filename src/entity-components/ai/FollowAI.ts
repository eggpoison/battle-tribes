import Board from "../../Board";
import Entity from "../../entities/Entity";
import Resource from "../../entities/resources/Resource";
import Tribesman from "../../entities/tribe-members/Tribesman";
import { ConstructorFunction, Point } from "../../utils";
import TransformComponent from "../TransformComponent";
import EntityAI from "./EntityAI";

abstract class FollowAI extends EntityAI {
   private readonly searchRadius: number;
   protected readonly moveSpeed: number;

   private validEntityConstr: ReadonlyArray<ConstructorFunction>;

   constructor(searchRadius: number, moveSpeed: number, validEntityConstr: ReadonlyArray<ConstructorFunction>) {
      super("follow");

      this.searchRadius = searchRadius;
      this.moveSpeed = moveSpeed;
      this.validEntityConstr = validEntityConstr;
   }

   protected filterEntities(entityArray: ReadonlyArray<Entity>): Array<Entity> {
      // Filter out unwanted entities
      const indexesToRemove = new Array<number>();

      for (let idx = entityArray.length - 1; idx >= 0; idx--) {
         const entity = entityArray[idx];

         // Remove itself and any entities which can't be attacked
         if (entity === this.entity) {
            indexesToRemove.push(idx);
            continue;
         }

         let isValidConstr = false;
         for (const constr of this.validEntityConstr) {
            if (entity instanceof constr) {
               isValidConstr = true;
               break;
            }
         }

         if (!isValidConstr) {
            indexesToRemove.push(idx);
         }
      }

      const filteredEntityArray = entityArray.slice();
      for (const idx of indexesToRemove) {
         filteredEntityArray.splice(idx, 1);
      }
      return filteredEntityArray;
   }

   protected getEntitiesInSearchRadius(entityPosition?: Point): Array<Entity> | null {
      if (typeof entityPosition === "undefined") entityPosition = this.entity.getComponent(TransformComponent)!.position;
      let nearbyEntities = TransformComponent.getNearbyEntities(entityPosition, this.searchRadius * Board.tileSize);
      nearbyEntities = this.filterEntities(nearbyEntities);

      if (nearbyEntities.length > 0) return nearbyEntities;
      return null;
   }

   protected findClosestEntity(): Entity | null {
      const transformComponent = this.entity.getComponent(TransformComponent)!;

      const entitiesInSearchRadius = this.getEntitiesInSearchRadius(transformComponent.position);
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
      const targetEntity = this.findClosestEntity();

      if (targetEntity !== null) {
         const targetPosition = targetEntity.getComponent(TransformComponent)!.position;
         super.moveToPosition(targetPosition, this.moveSpeed);
      }
   }
}

export default FollowAI;