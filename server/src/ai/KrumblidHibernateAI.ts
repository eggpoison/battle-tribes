import { CircularBox } from "../../../shared/src/boxes/CircularBox";
import { RectangularBox } from "../../../shared/src/boxes/RectangularBox";
import { CollisionGroup, getEntityCollisionGroup } from "../../../shared/src/collision-groups";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { TamingSkillID } from "../../../shared/src/taming";
import { clampToSubtileBoardDimensions, distance, Point, positionIsInWorld, randAngle, randFloat } from "../../../shared/src/utils";
import { getEntitiesInRange } from "../ai-shared";
import { AIHelperComponent } from "../components/AIHelperComponent";
import { hasTamingSkill, TamingComponentArray } from "../components/TamingComponent";
import { detachHitbox, TransformComponentArray } from "../components/TransformComponent";
import { createKrumblidMorphCocoonConfig } from "../entities/desert/krumblid-morph-cocoon";
import { createEntity, destroyEntity, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";

export class KrumblidHibernateAI {
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

const getRandomNearbyPosition = (krumblid: Entity): Point => {
   const krumblidTransformComponent = TransformComponentArray.getComponent(krumblid);
   const krumblidHitbox = krumblidTransformComponent.hitboxes[0];

   const RANGE = 600;
   
   let x: number;
   let y: number;
   do {
      x = krumblidHitbox.box.position.x + randFloat(-RANGE, RANGE);
      y = krumblidHitbox.box.position.y + randFloat(-RANGE, RANGE);
   } while (distance(krumblidHitbox.box.position.x, krumblidHitbox.box.position.y, x, y) > RANGE || !positionIsInWorld(x, y))

   return new Point(x, y);
}

const isValidHibernatePosition = (krumblid: Entity, position: Point): boolean => {
   const layer = getEntityLayer(krumblid);
   
   // Make sure it isn't in a wall
   
   const WALL_CHECK_RANGE = 28;

   const minSubtileX = clampToSubtileBoardDimensions(Math.floor((position.x - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const maxSubtileX = clampToSubtileBoardDimensions(Math.floor((position.x + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const minSubtileY = clampToSubtileBoardDimensions(Math.floor((position.y - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const maxSubtileY = clampToSubtileBoardDimensions(Math.floor((position.y + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));

   const testHitbox = new CircularBox(position.copy(), new Point(0, 0), 0, WALL_CHECK_RANGE);
   
   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         if (layer.subtileIsWall(subtileIndex)) {
            // @Speed
            const position = new Point((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE);
            // @Copynpaste
            const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
            if (testHitbox.getCollisionResult(tileBox).isColliding) {
               return false;
            }
         }
      }
   }

   // make sure it is kinda close to a wall

   {
      const WALL_CHECK_RANGE = 44;

      const minSubtileX = clampToSubtileBoardDimensions(Math.floor((position.x - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
      const maxSubtileX = clampToSubtileBoardDimensions(Math.floor((position.x + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
      const minSubtileY = clampToSubtileBoardDimensions(Math.floor((position.y - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
      const maxSubtileY = clampToSubtileBoardDimensions(Math.floor((position.y + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));

      const testHitbox = new CircularBox(position.copy(), new Point(0, 0), 0, WALL_CHECK_RANGE);
      
      let isNearWall = false;
      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            if (layer.subtileIsWall(subtileIndex)) {
               // @Speed
               const position = new Point((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE);
               const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
               if (testHitbox.getCollisionResult(tileBox).isColliding) {
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
      const nearbyEntities = getEntitiesInRange(layer, position.x, position.y, ENTITY_OCCUPATION_CHECK_RANGE);
      for (const entity of nearbyEntities) {
         if (entity === krumblid) {
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
   const nearbyEntities = getEntitiesInRange(layer, position.x, position.y, ENTITY_CHECK_RANGE);

   let numEntities = 0;
   for (const entity of nearbyEntities) {
      if (entity === krumblid) {
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

export function runKrumblidHibernateAI(krumblid: Entity, aiHelperComponent: AIHelperComponent, hibernateAI: KrumblidHibernateAI): void {
   // When the krumblid doesn't have a valid hibernate target position, go look for one
   if (hibernateAI.hibernateTargetPosition === null && getEntityAgeTicks(krumblid) % Math.floor(Settings.TICK_RATE / 4) === 0) {
      const potentialPosition = getRandomNearbyPosition(krumblid);
      if (isValidHibernatePosition(krumblid, potentialPosition)) {
         hibernateAI.hibernateTargetPosition = potentialPosition;
      }
   }

   const krumblidTransformComponent = TransformComponentArray.getComponent(krumblid);
   const krumblidHitbox = krumblidTransformComponent.hitboxes[0];

   // if the krumblid was previously latched onto a target or sitting on an object, unattach.
   if (krumblidHitbox.parent !== null) {
      detachHitbox(krumblidHitbox);
   }

   if (hibernateAI.hibernateTargetPosition !== null) {
      // go to it!
      aiHelperComponent.moveFunc(krumblid, hibernateAI.hibernateTargetPosition, hibernateAI.acceleration);
      aiHelperComponent.turnFunc(krumblid, hibernateAI.hibernateTargetPosition, hibernateAI.turnSpeed, hibernateAI.turnDamping);

      if (krumblidHitbox.box.position.distanceTo(hibernateAI.hibernateTargetPosition) < 1) {
         destroyEntity(krumblid);

         // If the krumblid has the imprint skill, then it retains its tame tribe
         const tamingComponent = TamingComponentArray.getComponent(krumblid);
         const tribe = hasTamingSkill(tamingComponent, TamingSkillID.imprint) ? tamingComponent.tameTribe : null;

         const cocoonConfig = createKrumblidMorphCocoonConfig(krumblidHitbox.box.position.copy(), randAngle(), tribe);
         createEntity(cocoonConfig, getEntityLayer(krumblid), 0);
      }
   } else {
      // wandah
      
      // @Copynpaste!!
      // Wander AI
      const wanderAI = aiHelperComponent.getWanderAI();
      wanderAI.update(krumblid);
      if (wanderAI.targetPosition !== null) {
         aiHelperComponent.moveFunc(krumblid, wanderAI.targetPosition, wanderAI.acceleration);
         aiHelperComponent.turnFunc(krumblid, wanderAI.targetPosition, wanderAI.turnSpeed, wanderAI.turnDamping);
      }
   }
}