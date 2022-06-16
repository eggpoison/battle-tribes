import Entity from "../../entities/Entity";
import Mob from "../../entities/mobs/Mob";
import { ConstructorFunction, Point, Vector } from "../../utils";
import TransformComponent from "../TransformComponent";
import AIManagerComponent, { SwitchCondition } from "./AIManangerComponent";

abstract class EntityAI {
   public abstract readonly id: string;

   protected entity!: Mob;

   private targetPosition: Point | null = null;

   private readonly tickCallbacks = new Array<() => void>();
   private readonly reachTargetCallbacks = new Array<() => void>();

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

      for (const tickCallback of this.tickCallbacks) {
         tickCallback();
      }
   }

   public checkTargetPosition(): void {
      if (this.targetPosition !== null) {
         const transformComponent = this.entity.getComponent(TransformComponent)!;
         if (transformComponent.velocity === null) return;

         const relativeTargetPos = transformComponent.position.subtract(this.targetPosition);

         const dotProduct = transformComponent.velocity.convertToPoint().dot(relativeTargetPos);
         if (dotProduct > 0) {
            this.reachTargetPosition(transformComponent);
         }
      }
   }

   protected reachTargetPosition(transformComponent: TransformComponent): void {
      this.targetPosition = null;

      transformComponent.stopMoving();

      // Call all reach target callbacks
      if (typeof this.reachTargetCallbacks !== "undefined") {
         for (const callback of this.reachTargetCallbacks) {
            callback();
         }
      }
   }

   /** Filter out unwanted targets */
   protected filterTargets(entities: ReadonlyArray<Entity>, targets: ReadonlyArray<ConstructorFunction>): Array<Entity> {
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

   protected onLoad?(): void;

   protected setTargetPosition(position: Point): void {
      this.targetPosition = position;
   }

   public move(vector: Vector): void {
      const transformComponent = this.entity.getComponent(TransformComponent)!;

      // Rotate to face the position
      transformComponent.rotation = vector.direction;

      transformComponent.setVelocity(vector);
      transformComponent.isMoving = true;
   }

   /**
    * Moves the entity to a specified position
    * @param position The position to move to
    * @param speed The speed at which to move to the position (in tiles per second)
    */
   public moveToPosition(position: Point, speed: number): void {
      this.targetPosition = position;

      const transformComponent = this.entity.getComponent(TransformComponent)!;

      const angle = transformComponent.position.angleBetween(position);
      transformComponent.rotation = angle;
      
      const movementVector = new Vector(speed, angle);
      transformComponent.setVelocity(movementVector);
      transformComponent.isMoving = true;
   }

   protected changeCurrentAI(newID: string): void {
      this.entity.getComponent(AIManagerComponent)!.changeCurrentAI(newID);
   }

   private switchCondition?: SwitchCondition;
   public setSwitchCondition(switchCondition: SwitchCondition): void {
      this.switchCondition = switchCondition;
   }

   public addTickCallback(callback: () => void): void {
      this.tickCallbacks.push(callback);
   }

   public addReachTargetCallback(callback: () => void): void {
      this.reachTargetCallbacks.push(callback);
   }
}

export default EntityAI;