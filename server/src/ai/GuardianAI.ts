import { EntityID } from "../../../shared/src/entities";
import { moveEntityToEntity } from "../ai-shared";
import { AIHelperComponent, AIHelperComponentArray } from "../components/AIHelperComponent";
import { GuardianComponent, GuardianComponentArray } from "../components/GuardianComponent";
import { HealthComponentArray } from "../components/HealthComponent";
import { getEntityTile, TransformComponent, TransformComponentArray } from "../components/TransformComponent";

const entityIsTargetted = (guardianComponent: GuardianComponent, target: EntityID, targetTransformComponent: TransformComponent): boolean => {
   if (!HealthComponentArray.hasComponent(target)) {
      return false;
   }

   // Don't attack other guardians
   if (GuardianComponentArray.hasComponent(target)) {
      return false;
   }
   
   const entityTile = getEntityTile(targetTransformComponent);
   return guardianComponent.homeTiles.includes(entityTile);
}

const getTarget = (transformComponent: TransformComponent, guardianComponent: GuardianComponent, aiHelperComponent: AIHelperComponent): EntityID | null => {
   let target: EntityID | null = null;
   let minDist = Number.MAX_SAFE_INTEGER;
   
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const dist = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
      if (dist < minDist && entityIsTargetted(guardianComponent, entity, entityTransformComponent)) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

export default class GuardianAI {
   private readonly acceleration: number;
   private readonly turnSpeed: number;
   
   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
   public getTarget(guardian: EntityID): EntityID | null {
      const transformComponent = TransformComponentArray.getComponent(guardian);
      const guardianComponent = GuardianComponentArray.getComponent(guardian);
      const aiHelperComponent = AIHelperComponentArray.getComponent(guardian);

      const target = getTarget(transformComponent, guardianComponent, aiHelperComponent);
      return target;
   }
   
   public run(guardian: EntityID, target: EntityID): void {
      // Move towards the target
      moveEntityToEntity(guardian, target, this.acceleration, this.turnSpeed);
   }
}