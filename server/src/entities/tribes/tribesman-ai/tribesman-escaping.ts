import { angle } from "webgl-test-shared/dist/utils";
import Entity from "../../../Entity";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { clearTribesmanPath, getTribesmanAcceleration, getTribesmanVisionRange } from "./tribesman-ai-utils";
import { EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { HealthComponent } from "../../../components/HealthComponent";

export function tribesmanShouldEscape(entityType: EntityType, healthComponent: HealthComponent): boolean {
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

export function escapeFromEnemies(tribesman: Entity, visibleEnemies: ReadonlyArray<Entity>, visibleHostileMobs: ReadonlyArray<Entity>): void {
   // Calculate the escape position based on the position of all visible enemies
   let averageEnemyX = 0;
   let averageEnemyY = 0;
   for (let i = 0; i < visibleEnemies.length; i++) {
      const enemy = visibleEnemies[i];

      let distance = tribesman.position.calculateDistanceBetween(enemy.position);
      if (distance > getTribesmanVisionRange(tribesman)) {
         distance = getTribesmanVisionRange(tribesman);
      }
      const weight = Math.pow(1 - distance / getTribesmanVisionRange(tribesman) / 1.25, 0.5);

      const relativeX = (enemy.position.x - tribesman.position.x) * weight;
      const relativeY = (enemy.position.y - tribesman.position.y) * weight;

      averageEnemyX += relativeX + tribesman.position.x;
      averageEnemyY += relativeY + tribesman.position.y;
      // @Temporary: shouldn't occur, fix root cause
      if (isNaN(averageEnemyX) || isNaN(averageEnemyY)) {
         console.warn("NaN!");
         return;
      }
   }
   // @Cleanup: Copy and paste
   for (let i = 0; i < visibleHostileMobs.length; i++) {
      const enemy = visibleHostileMobs[i];

      let distance = tribesman.position.calculateDistanceBetween(enemy.position);
      if (distance > getTribesmanVisionRange(tribesman)) {
         distance = getTribesmanVisionRange(tribesman);
      }
      const weight = Math.pow(1 - distance / getTribesmanVisionRange(tribesman) / 1.25, 0.5);

      const relativeX = (enemy.position.x - tribesman.position.x) * weight;
      const relativeY = (enemy.position.y - tribesman.position.y) * weight;

      averageEnemyX += relativeX + tribesman.position.x;
      averageEnemyY += relativeY + tribesman.position.y;
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

   const runDirection = angle(averageEnemyX - tribesman.position.x, averageEnemyY - tribesman.position.y) + Math.PI;
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);

   physicsComponent.acceleration.x = getTribesmanAcceleration(tribesman.id) * Math.sin(runDirection);
   physicsComponent.acceleration.y = getTribesmanAcceleration(tribesman.id) * Math.cos(runDirection);
   physicsComponent.targetRotation = runDirection;
   physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

   clearTribesmanPath(tribesman);
}