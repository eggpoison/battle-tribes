import Board from "../../Board";
import Entity from "../../entities/Entity";
import Mob from "../../entities/mobs/Mob";
import { Point } from "../../utils";
import TransformComponent from "../TransformComponent";
import EntityAI from "./EntityAI";

class FollowAI extends EntityAI {
   private readonly searchRadius: number;
   protected readonly moveSpeed: number;

   constructor(searchRadius: number, moveSpeed: number) {
      super("search");

      this.searchRadius = searchRadius;
      this.moveSpeed = moveSpeed;
   }

   private filterEntities(entityArray: ReadonlyArray<Entity>): Array<Entity> {
      // Filter out unwanted entities
      const indexesToRemove = new Array<number>();

      for (let idx = entityArray.length - 1; idx >= 0; idx--) {
         const entity = entityArray[idx];

         // Remove itself and any entities which are mobs
         if (entity === this.entity || !Mob.entityCanBeAttackedByMob(entity)) {
            indexesToRemove.push(idx);
         }
      }

      const filteredEntityArray = entityArray.slice();
      for (const idx of indexesToRemove) {
         filteredEntityArray.splice(idx, 1);
      }
      return filteredEntityArray;
   }

   protected getEntitiesInSearchRadius(entityPosition: Point): Array<Entity> | null {
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