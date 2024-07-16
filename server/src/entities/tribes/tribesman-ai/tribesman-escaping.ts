import { angle } from "webgl-test-shared/dist/utils";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { clearTribesmanPath, getTribesmanAcceleration, getTribesmanVisionRange } from "./tribesman-ai-utils";
import { EntityID, EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { HealthComponent } from "../../../components/HealthComponent";
import { TransformComponentArray } from "../../../components/TransformComponent";

export function tribesmanShouldEscape(entityType: EntityType, healthComponent: HealthComponent): boolean {
   // @Temporary
   return false;
   
   const remainingHealthRatio = healthComponent.health / healthComponent.maxHealth;
   
   switch (entityType) {
      case EntityType.tribeWorker: return remainingHealthRatio <= 0.5;
      case EntityType.tribeWarrior: return remainingHealthRatio <= 0.4;
      // @Robustness
      default: {
         throw new Error("Unknown tribesman type " + EntityTypeString[entityType]);
      }
   }
}

export function escapeFromEnemies(tribesman: EntityID, visibleEnemies: ReadonlyArray<EntityID>, visibleHostileMobs: ReadonlyArray<EntityID>): void {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   // Calculate the escape position based on the position of all visible enemies
   let averageEnemyX = 0;
   let averageEnemyY = 0;
   for (let i = 0; i < visibleEnemies.length; i++) {
      const enemy = visibleEnemies[i];

      const enemyTransformComponent = TransformComponentArray.getComponent(enemy);
      
      let distance = transformComponent.position.calculateDistanceBetween(enemyTransformComponent.position);
      if (distance > getTribesmanVisionRange(tribesman)) {
         distance = getTribesmanVisionRange(tribesman);
      }
      const weight = Math.pow(1 - distance / getTribesmanVisionRange(tribesman) / 1.25, 0.5);

      const relativeX = (enemyTransformComponent.position.x - transformComponent.position.x) * weight;
      const relativeY = (enemyTransformComponent.position.y - transformComponent.position.y) * weight;

      averageEnemyX += relativeX + transformComponent.position.x;
      averageEnemyY += relativeY + transformComponent.position.y;
      // @Temporary: shouldn't occur, fix root cause
      if (isNaN(averageEnemyX) || isNaN(averageEnemyY)) {
         console.warn("NaN!");
         return;
      }
   }
   // @Cleanup: Copy and paste
   for (let i = 0; i < visibleHostileMobs.length; i++) {
      const enemy = visibleHostileMobs[i];

      const enemyTransformComponent = TransformComponentArray.getComponent(enemy);

      let distance = transformComponent.position.calculateDistanceBetween(enemyTransformComponent.position);
      if (distance > getTribesmanVisionRange(tribesman)) {
         distance = getTribesmanVisionRange(tribesman);
      }
      const weight = Math.pow(1 - distance / getTribesmanVisionRange(tribesman) / 1.25, 0.5);

      const relativeX = (enemyTransformComponent.position.x - transformComponent.position.x) * weight;
      const relativeY = (enemyTransformComponent.position.y - transformComponent.position.y) * weight;

      averageEnemyX += relativeX + transformComponent.position.x;
      averageEnemyY += relativeY + transformComponent.position.y;
      // @Temporary: shouldn't occur, fix root cause
      if (isNaN(averageEnemyX) || isNaN(averageEnemyY)) {
         console.warn("NaN!");
         return;
      }
   }
   averageEnemyX /= visibleEnemies.length + visibleHostileMobs.length;
   averageEnemyY /= visibleEnemies.length + visibleHostileMobs.length;

   // 
   // Run away from that position
   // 

   const runDirection = angle(averageEnemyX - transformComponent.position.x, averageEnemyY - transformComponent.position.y) + Math.PI;
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman);

   physicsComponent.acceleration.x = getTribesmanAcceleration(tribesman) * Math.sin(runDirection);
   physicsComponent.acceleration.y = getTribesmanAcceleration(tribesman) * Math.cos(runDirection);
   physicsComponent.targetRotation = runDirection;
   physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

   clearTribesmanPath(tribesman);
}