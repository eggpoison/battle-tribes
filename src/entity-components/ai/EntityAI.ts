import Board from "../../Board";
import Entity from "../../entities/Entity";
import Mob from "../../entities/mobs/Mob";
import SETTINGS from "../../settings";
import { ConstructorFunction, Point, Vector } from "../../utils";
import TransformComponent from "../TransformComponent";
import AIManagerComponent from "./AIManangerComponent";

type SwitchCondition = {
   readonly newID: string;
   shouldSwitch(): boolean;
   onSwitch?(): void;
}

abstract class EntityAI {
   public abstract readonly id: string;

   protected entity!: Mob;

   private targetPosition: Point | null = null;

   public setEntity(entity: Mob): void {
      this.entity = entity;

      if (typeof this.onLoad !== "undefined") this.onLoad();
   }

   public tick(): void {
      if (typeof this.switchCondition !== "undefined" && this.switchCondition.shouldSwitch()) {
         this.changeCurrentAI(this.switchCondition.newID);

         if (typeof this.switchCondition.onSwitch !== "undefined") {
            this.switchCondition.onSwitch();
         }
      }
   }

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

   /** Filter out unwanted targets */
   private filterTargets(entities: ReadonlyArray<Entity>, targets: ReadonlyArray<ConstructorFunction>): Array<Entity> {
      const filteredTargets = entities.slice();

      for (let idx = filteredTargets.length - 1; idx >= 0; idx--) {
         const entity = filteredTargets[idx];

         // Remove itself and any entities which can't be attacked
         if (entity === this.entity) {
            filteredTargets.splice(idx, 1);
            continue;
         }

         // Remove entities which aren't targets
         let isValidConstr = false;
         for (const target of targets) {
            if (entity instanceof target) {
               isValidConstr = true;
               break;
            }
         }
         if (!isValidConstr) {
            filteredTargets.splice(idx, 1);
            continue;
         }
      }

      return filteredTargets;
   }

   public getEntitiesInSearchRadius(position: Point, range: number, validTargets?: ReadonlyArray<ConstructorFunction>): Array<Entity> | null {
      let nearbyEntities = TransformComponent.getNearbyEntities(position, range * Board.tileSize);
      if (typeof validTargets !== "undefined") nearbyEntities = this.filterTargets(nearbyEntities, validTargets);

      if (nearbyEntities.length > 0) return nearbyEntities;
      return null;
   }

   protected onLoad?(): void;

   protected setTargetPosition(position: Point): void {
      this.targetPosition = position;
   }

   protected moveToPosition(position: Point, speed: number): void {
      this.targetPosition = position;

      const transformComponent = this.entity.getComponent(TransformComponent)!;

      const angle = transformComponent.position.angleBetween(position);
      transformComponent.rotation = angle;
      
      const movementVector = new Vector(speed * Board.tileSize / SETTINGS.tps, angle);
      transformComponent.setVelocity(movementVector);
   }

   protected changeCurrentAI(newID: string): void {
      this.entity.getComponent(AIManagerComponent)!.changeCurrentAI(newID);
   }

   private switchCondition?: SwitchCondition;
   public setSwitchCondition(switchCondition: SwitchCondition): void {
      this.switchCondition = switchCondition;
   }
}

export default EntityAI;