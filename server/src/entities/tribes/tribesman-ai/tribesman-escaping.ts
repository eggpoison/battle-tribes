import { angle, polarVec2 } from "battletribes-shared/utils";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { getTribesmanAcceleration } from "./tribesman-ai-utils";
import { Entity, EntityType, EntityTypeString } from "battletribes-shared/entities";
import { HealthComponent } from "../../../components/HealthComponent";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";
import { applyAccelerationFromGround, Hitbox, turnHitboxToAngle } from "../../../hitboxes";
import { clearPathfinding } from "../../../components/AIPathfindingComponent";

export function tribeMemberShouldEscape(entityType: EntityType, healthComponent: HealthComponent): boolean {
   const remainingHealthRatio = healthComponent.health / healthComponent.maxHealth;
   
   switch (entityType) {
      case EntityType.cogwalker:
      case EntityType.scrappy:
      case EntityType.tribeWorker: return remainingHealthRatio <= 0.5;
      case EntityType.tribeWarrior: return remainingHealthRatio <= 0.4;
      // @Robustness
      default: {
         throw new Error("Unknown tribesman type " + EntityTypeString[entityType]);
      }
   }
}

// @Cleanup: just pass in visibleThreats
export function escapeFromEnemies(tribesman: Entity, visibleEnemies: ReadonlyArray<Entity>, visibleHostileMobs: ReadonlyArray<Entity>): void {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);
   const visionRange = aiHelperComponent.visionRange;
   
   // Calculate the escape position based on the position of all visible enemies
   let averageEnemyX = 0;
   let averageEnemyY = 0;
   for (let i = 0; i < visibleEnemies.length; i++) {
      const enemy = visibleEnemies[i];

      const enemyTransformComponent = TransformComponentArray.getComponent(enemy);
      const enemyHitbox = enemyTransformComponent.hitboxes[0];
      
      let distance = tribesmanHitbox.box.position.distanceTo(enemyHitbox.box.position);
      // @Hack
      if (distance > visionRange) {
         distance = visionRange;
      }
      const weight = Math.pow(1 - distance / visionRange / 1.25, 0.5);

      const relativeX = (enemyHitbox.box.position.x - tribesmanHitbox.box.position.x) * weight;
      const relativeY = (enemyHitbox.box.position.y - tribesmanHitbox.box.position.y) * weight;

      averageEnemyX += relativeX + tribesmanHitbox.box.position.x;
      averageEnemyY += relativeY + tribesmanHitbox.box.position.y;
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
      const enemyHitbox = enemyTransformComponent.hitboxes[0];

      let distance = tribesmanHitbox.box.position.distanceTo(enemyHitbox.box.position);
      if (distance > visionRange) {
         distance = visionRange;
      }
      const weight = Math.pow(1 - distance / visionRange / 1.25, 0.5);

      const relativeX = (enemyHitbox.box.position.x - tribesmanHitbox.box.position.x) * weight;
      const relativeY = (enemyHitbox.box.position.y - tribesmanHitbox.box.position.y) * weight;

      averageEnemyX += relativeX + tribesmanHitbox.box.position.x;
      averageEnemyY += relativeY + tribesmanHitbox.box.position.y;
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

   const runDir = angle(averageEnemyX - tribesmanHitbox.box.position.x, averageEnemyY - tribesmanHitbox.box.position.y) + Math.PI;

   const acceleration = getTribesmanAcceleration(tribesman);
   applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, runDir));

   turnHitboxToAngle(tribesmanHitbox, runDir, TRIBESMAN_TURN_SPEED, 0.5, false);

   clearPathfinding(tribesman);
}