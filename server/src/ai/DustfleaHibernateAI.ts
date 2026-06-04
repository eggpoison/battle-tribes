import { getEntityCollisionGroup, CollisionGroup } from "../../../shared/dist/collision-groups.js";
import { getCircleRectangleCollisionResult } from "../../../shared/dist/collision.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Settings } from "../../../shared/dist/settings.js";
import { getSubtileIndex } from "../../../shared/dist/subtiles.js";
import { Point, randFloat, distance, positionIsInWorld, clampToSubtileBoardDimensions, randAngle } from "../../../shared/dist/utils.js";
import { getEntitiesInRange } from "../ai-shared.js";
import { AIHelperComponent } from "../components/AIHelperComponent.js";
import { detachHitbox, TransformComponentArray } from "../components/TransformComponent.js";
import { createDustfleaMorphCocoonConfig } from "../entities/desert/dustflea-morph-cocoon.js";
import { createEntity, destroyEntity, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world.js";

export class DustfleaHibernateAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;
   public readonly turnDamping: number;
   
   public hibernateTargetPosition: Point | null = null;

   constructor(acceleration: number, turnSpeed: number, turnDamping: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
      this.turnDamping = turnDamping;
   }
}

const getRandomNearbyPosition = (dustflea: Entity): Point => {
   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.hitboxes[0];

   const RANGE = 600;
   
   let x: number;
   let y: number;
   do {
      x = dustfleaHitbox.box.posX + randFloat(-RANGE, RANGE);
      y = dustfleaHitbox.box.posY + randFloat(-RANGE, RANGE);
   } while (distance(dustfleaHitbox.box.posX, dustfleaHitbox.box.posY, x, y) > RANGE || !positionIsInWorld(x, y))

   return new Point(x, y);
}

const isValidHibernatePosition = (dustflea: Entity, x: number, y: number): boolean => {
   const layer = getEntityLayer(dustflea);
   
   // Make sure it isn't in a wall
   
   const WALL_CHECK_RANGE = 28;

   const minSubtileX = clampToSubtileBoardDimensions(Math.floor((x - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const maxSubtileX = clampToSubtileBoardDimensions(Math.floor((x + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const minSubtileY = clampToSubtileBoardDimensions(Math.floor((y - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const maxSubtileY = clampToSubtileBoardDimensions(Math.floor((y + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));

   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         if (layer.subtileIsWall(subtileIndex)) {
            if (getCircleRectangleCollisionResult(x, y, WALL_CHECK_RANGE, (subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE, 0).isColliding) {
               return false;
            }
         }
      }
   }

   // make sure it is kinda close to a wall

   {
      const WALL_CHECK_RANGE = 44;

      const minSubtileX = clampToSubtileBoardDimensions(Math.floor((x - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
      const maxSubtileX = clampToSubtileBoardDimensions(Math.floor((x + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
      const minSubtileY = clampToSubtileBoardDimensions(Math.floor((y - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
      const maxSubtileY = clampToSubtileBoardDimensions(Math.floor((y + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));

      let isNearWall = false;
      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            if (layer.subtileIsWall(subtileIndex)) {
               if (getCircleRectangleCollisionResult(x, y, WALL_CHECK_RANGE, (subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE, 0).isColliding) {
                  isNearWall = true;
               }
            }
         }
      }

      if (!isNearWall) {
         return false;
      }
   }

   // make sure the hiberation place isn't occupied

   const ENTITY_OCCUPATION_CHECK_RANGE = 60;
   {
      const nearbyEntities = getEntitiesInRange(layer, x, y, ENTITY_OCCUPATION_CHECK_RANGE);
      for (const entity of nearbyEntities) {
         if (entity === dustflea) {
            continue;
         }

         const entityType = getEntityType(entity);
         const collisionGroup = getEntityCollisionGroup(entityType);
         if (collisionGroup !== CollisionGroup.none && collisionGroup !== CollisionGroup.decoration) {
            return false;
         }
      }
   }
   
   // Make sure there aren't too many entities in range

   const ENTITY_CHECK_RANGE = 130;
   const nearbyEntities = getEntitiesInRange(layer, x, y, ENTITY_CHECK_RANGE);

   let numEntities = 0;
   for (const entity of nearbyEntities) {
      if (entity === dustflea) {
         continue;
      }

      const entityType = getEntityType(entity);
      const collisionGroup = getEntityCollisionGroup(entityType);
      if (collisionGroup !== CollisionGroup.none && collisionGroup !== CollisionGroup.decoration) {
         numEntities++;
      }
   }

   if (numEntities >= 9) {
      return false;
   }

   return true;
}

export function runHibernateAI(dustflea: Entity, aiHelperComponent: AIHelperComponent, ai: DustfleaHibernateAI): void {
   // When the dustflea doesn't have a valid hibernate target position, go look for one
   if (ai.hibernateTargetPosition === null && getEntityAgeTicks(dustflea) % Math.floor(Settings.TICK_RATE / 4) === 0) {
      const potentialPosition = getRandomNearbyPosition(dustflea);
      if (isValidHibernatePosition(dustflea, potentialPosition.x, potentialPosition.y)) {
         ai.hibernateTargetPosition = potentialPosition;
      }
   }

   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.hitboxes[0];

   // if the dustflea was previously latched onto a target or sitting on an object, unattach.
   if (dustfleaHitbox.parent !== null) {
      detachHitbox(dustfleaHitbox);
   }

   if (ai.hibernateTargetPosition !== null) {
      // go to it!
      aiHelperComponent.moveFunc(dustflea, ai.hibernateTargetPosition.x, ai.hibernateTargetPosition.y, ai.acceleration);
      aiHelperComponent.turnFunc(dustflea, ai.hibernateTargetPosition.x, ai.hibernateTargetPosition.y, ai.turnSpeed, ai.turnDamping);

      if (distance(dustfleaHitbox.box.posX, dustfleaHitbox.box.posY, ai.hibernateTargetPosition.x, ai.hibernateTargetPosition.y) < 1) {
         destroyEntity(dustflea);

         const cocoonConfig = createDustfleaMorphCocoonConfig(dustfleaHitbox.box.posX, dustfleaHitbox.box.posY, randAngle());
         createEntity(cocoonConfig, getEntityLayer(dustflea), 0);
      }
   } else {
      // wandah
      
      // @Cleanup: would be better to just do nothing and the dustflea will fall back to its wander patterns
      
      // @Copynpaste!!
      // Wander AI
      const wanderAI = aiHelperComponent.getWanderAI();
      wanderAI.update(dustflea);
      if (wanderAI.targetPosition !== null) {
         aiHelperComponent.moveFunc(dustflea, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.acceleration);
         aiHelperComponent.turnFunc(dustflea, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.turnSpeed, wanderAI.turnDamping);
      }
   }
}