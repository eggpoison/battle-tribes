import { EntityID } from "battletribes-shared/entities";
import { EscapeAIComponentArray } from "../components/EscapeAIComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { TransformComponentArray } from "../components/TransformComponent";

export function registerAttackingEntity(entity: EntityID, attackingEntity: EntityID): void {
   const escapeAIComponent = EscapeAIComponentArray.getComponent(entity);

   const idx = escapeAIComponent.attackingEntities.indexOf(attackingEntity);
   if (idx === -1) {
      escapeAIComponent.attackingEntities.push(attackingEntity);
      escapeAIComponent.attackEntityTicksSinceLastAttack.push(0);
   } else {
      escapeAIComponent.attackEntityTicksSinceLastAttack[idx] = 0;
   }
}

export function runFromAttackingEntity(entity: EntityID, attackingEntity: EntityID, acceleration: number, turnSpeed: number): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   const attackingEntityTransformComponent = TransformComponentArray.getComponent(attackingEntity);

   const direction = attackingEntityTransformComponent.position.calculateAngleBetween(transformComponent.position);

   physicsComponent.acceleration.x = acceleration * Math.sin(direction);
   physicsComponent.acceleration.y = acceleration * Math.cos(direction);
   physicsComponent.targetRotation = direction;
   physicsComponent.turnSpeed = turnSpeed;
}

export function chooseEscapeEntity(entity: EntityID, visibleEntities: ReadonlyArray<EntityID>): EntityID | null {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const escapeAIComponent = EscapeAIComponentArray.getComponent(entity);
   
   let minDistance = Number.MAX_SAFE_INTEGER;
   let escapeEntity: EntityID | null = null;
   for (let i = 0; i < escapeAIComponent.attackingEntities.length; i++) {
      const attackingEntity = escapeAIComponent.attackingEntities[i];

      // Don't escape from entities which aren't visible
      if (!visibleEntities.includes(attackingEntity)) {
         continue;
      }
      
      const attackingEntityTransformComponent = TransformComponentArray.getComponent(attackingEntity);
      const distance = transformComponent.position.calculateDistanceBetween(attackingEntityTransformComponent.position);
      if (distance < minDistance) {
         minDistance = distance;
         escapeEntity = attackingEntity;
      }
   }

   return escapeEntity;
}