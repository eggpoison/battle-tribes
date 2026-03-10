import { Settings, collisionBitsAreCompatible, Point, rotateXAroundOrigin, rotateYAroundOrigin, Box, HitboxCollisionType, HitboxFlag, RectangularBox, CircularBox, Entity, CollisionResult, _bounds } from "webgl-test-shared";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import Chunk from "./Chunk";
import { getEntityLayer, getEntityType } from "./world";
import Layer from "./Layer";
import { playerInstance } from "./player";
import { applyForce, getHitboxVelocity, Hitbox, setHitboxVelocity, translateHitbox } from "./hitboxes";
import { getEntityComponentArrays } from "./entity-component-types";

export interface HitboxCollisionPair {
   readonly affectedHitbox: Hitbox;
   readonly collidingHitbox: Hitbox;
   readonly collisionResult: CollisionResult;
}

interface EntityPairCollisionInfo {
   readonly collidingEntity: Entity;
   readonly collidingHitboxPairs: Array<HitboxCollisionPair>;
}

/** For every affected entity, stores collision info for any colliding entities */
type CollisionPairs = Map<number, Array<EntityPairCollisionInfo>>;

const resolveHardCollision = (affectedHitbox: Hitbox, collisionResult: CollisionResult): void => {
   // @Temporary: once it's guaranteed that overlap !== 0 this won't be needed.
   if (collisionResult.overlap.magnitude() === 0) {
      console.warn("my code is perilous " + Math.random());
      return;
   }

   // Transform the entity out of the hitbox
   translateHitbox(affectedHitbox, collisionResult.overlap.x, collisionResult.overlap.y);

   const previousVelocity = getHitboxVelocity(affectedHitbox);
   
   // Kill all the velocity going into the hitbox
   const _bx = collisionResult.overlap.x / collisionResult.overlap.magnitude();
   const _by = collisionResult.overlap.y / collisionResult.overlap.magnitude();
   // @SPEED
   const bx = rotateXAroundOrigin(_bx, _by, Math.PI/2);
   const by = rotateYAroundOrigin(_bx, _by, Math.PI/2);
   const velocityProjectionCoeff = previousVelocity.x * bx + previousVelocity.y * by;
   const vx = bx * velocityProjectionCoeff;
   const vy = by * velocityProjectionCoeff;
   setHitboxVelocity(affectedHitbox, vx, vy);
}

const resolveSoftCollision = (affectedHitbox: Hitbox, pushingHitbox: Hitbox, collisionResult: CollisionResult): void => {
   const pushForce = Settings.ENTITY_PUSH_FORCE * pushingHitbox.mass;
   applyForce(affectedHitbox, new Point(collisionResult.overlap.x * pushForce, collisionResult.overlap.y * pushForce));
}

export function collide(entity: Entity, collidingEntity: Entity, hitbox: Hitbox, pushingHitbox: Hitbox, collisionResult: CollisionResult, isPushed: boolean): void {
   if (!hitbox.isStatic) {
      if (pushingHitbox.collisionType === HitboxCollisionType.hard) {
         resolveHardCollision(hitbox, collisionResult);
      } else {
         resolveSoftCollision(hitbox, pushingHitbox, collisionResult);
      }
   }

   const componentArrays = getEntityComponentArrays(getEntityType(entity));
   for (const componentArray of componentArrays) {
      if (typeof componentArray.onCollision !== "undefined") {
         componentArray.onCollision(entity, collidingEntity, hitbox, pushingHitbox);
      }
   }
}

const calculateEntityPairCollisionInfo = (affectedEntity: Entity, collidingEntity: Entity): EntityPairCollisionInfo | null => {
   const transformComponent1 = TransformComponentArray.getComponent(affectedEntity);
   const transformComponent2 = TransformComponentArray.getComponent(collidingEntity);

   // AABB bounding area check
   if (transformComponent1.boundingAreaMinX > transformComponent2.boundingAreaMaxX || // minX(1) > maxX(2)
       transformComponent1.boundingAreaMaxX < transformComponent2.boundingAreaMinX || // maxX(1) < minX(2)
       transformComponent1.boundingAreaMinY > transformComponent2.boundingAreaMaxY || // minY(1) > maxY(2)
       transformComponent1.boundingAreaMaxY < transformComponent2.boundingAreaMinY) { // maxY(1) < minY(2)
      return null;
   }

   const hitboxCollisionPairs = new Array<HitboxCollisionPair>();
   
   // More expensive hitbox check
   for (const affectedHitbox of transformComponent1.hitboxes) {
      const box = affectedHitbox.box;

      for (const collidingHitbox of transformComponent2.hitboxes) {
         const otherBox = collidingHitbox.box;

         if (!collisionBitsAreCompatible(affectedHitbox.collisionMask, affectedHitbox.collisionBit, collidingHitbox.collisionMask, collidingHitbox.collisionBit)) {
            continue;
         }
         
         // If the objects are colliding, add the colliding object and this object
         const collisionResult = box.getCollisionResult(otherBox);
         if (collisionResult.isColliding) {
            hitboxCollisionPairs.push({
               affectedHitbox: affectedHitbox,
               collidingHitbox: collidingHitbox,
               collisionResult: collisionResult
            });
         }
      }
   }

   if (hitboxCollisionPairs.length > 0) {
      return {
         collidingEntity: collidingEntity,
         collidingHitboxPairs: hitboxCollisionPairs
      };
   }
   return null;
}

const entityCollisionPairHasAlreadyBeenChecked = (collisionPairs: CollisionPairs, affectedEntity: Entity, collidingEntity: Entity): boolean => {
   const collisionInfos = collisionPairs.get(affectedEntity);
   if (typeof collisionInfos === "undefined") {
      return false;
   }

   for (const collisionInfo of collisionInfos) {
      if (collisionInfo.collidingEntity === collidingEntity) {
         return true;
      }
   }
   return false;
}

const collectEntityCollisionsWithChunk = (collisionPairs: CollisionPairs, affectedEntity: Entity, chunk: Chunk): void => {
   for (const collidingEntity of chunk.entities) {
      if (collidingEntity === affectedEntity) {
         continue;
      }

      // @Speed: re-gotten further in the line
      const entityTransformComponent = TransformComponentArray.getComponent(affectedEntity);
      const otherEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

      // Make sure the entities aren't in the same carry heirarchy
      // @Hack
      const entityHitbox = entityTransformComponent.hitboxes[0];
      const otherEntityHitbox = otherEntityTransformComponent.hitboxes[0];
      if (entityHitbox.rootEntity === otherEntityHitbox.rootEntity) {
         continue;
      }

      if (entityCollisionPairHasAlreadyBeenChecked(collisionPairs, affectedEntity, collidingEntity)) {
         continue;
      }

      const collisionInfo = calculateEntityPairCollisionInfo(affectedEntity, collidingEntity);
      if (collisionInfo === null) {
         continue;
      }
      
      const existingCollisionPairs = collisionPairs.get(affectedEntity);
      if (typeof existingCollisionPairs === "undefined") {
         collisionPairs.set(affectedEntity, [collisionInfo]);
      } else {
         existingCollisionPairs.push(collisionInfo);
      }
   }
}

// @COPYNPASTE!! @Hack for speed
const collectNonGrassEntityCollisionsWithChunk = (collisionPairs: CollisionPairs, affectedEntity: Entity, chunk: Chunk): void => {
   for (const collidingEntity of chunk.nonGrassEntities) {
      if (collidingEntity === affectedEntity) {
         continue;
      }

      // @Speed: re-gotten further in the line
      const entityTransformComponent = TransformComponentArray.getComponent(affectedEntity);
      const otherEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

      // Make sure the entities aren't in the same carry heirarchy
      // @Hack
      const entityHitbox = entityTransformComponent.hitboxes[0];
      const otherEntityHitbox = otherEntityTransformComponent.hitboxes[0];
      if (entityHitbox.rootEntity === otherEntityHitbox.rootEntity) {
         continue;
      }

      if (entityCollisionPairHasAlreadyBeenChecked(collisionPairs, affectedEntity, collidingEntity)) {
         continue;
      }

      const collisionInfo = calculateEntityPairCollisionInfo(affectedEntity, collidingEntity);
      if (collisionInfo === null) {
         continue;
      }
      
      const existingCollisionPairs = collisionPairs.get(affectedEntity);
      if (typeof existingCollisionPairs === "undefined") {
         collisionPairs.set(affectedEntity, [collisionInfo]);
      } else {
         existingCollisionPairs.push(collisionInfo);
      }
   }
}

const resolveCollisionPairs = (collisionPairs: CollisionPairs, onlyResolvePlayerCollisions: boolean): void => {
   for (const [affectedEntity, collisionInfos] of collisionPairs.entries()) {
      for (const collisionInfo of collisionInfos) {
         for (const collidingHitboxPair of collisionInfo.collidingHitboxPairs) {
            collide(affectedEntity, collisionInfo.collidingEntity, collidingHitboxPair.affectedHitbox, collidingHitboxPair.collidingHitbox, collidingHitboxPair.collisionResult, !onlyResolvePlayerCollisions || affectedEntity === playerInstance);
         }
      }
   }
}

export function resolveEntityCollisions(layer: Layer): void {
   const collisionPairs: CollisionPairs = new Map();
   
   const numChunks = Settings.WORLD_SIZE_CHUNKS * Settings.WORLD_SIZE_CHUNKS;
   for (let i = 0; i < numChunks; i++) {
      const chunk = layer.chunks[i];

      // @Bug: collision can happen multiple times
      // For all physics entities, check for collisions with all other entities in the chunk
      for (const entity of chunk.nonGrassEntities) {
         collectEntityCollisionsWithChunk(collisionPairs, entity, chunk);
      }
   }

   resolveCollisionPairs(collisionPairs, false);
}

export function resolvePlayerCollisions(): void {
   if (playerInstance === null) {
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   
   const collisionPairs: CollisionPairs = new Map();

   for (const chunk of transformComponent.chunks) {
      collectNonGrassEntityCollisionsWithChunk(collisionPairs, playerInstance, chunk);
   }

   resolveCollisionPairs(collisionPairs, true);
}

export function resolveWallCollisions(entity: Entity): boolean {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   let hasMoved = false;
   const layer = getEntityLayer(entity);
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitbox.flags.includes(HitboxFlag.IGNORES_WALL_COLLISIONS)) {
         continue;
      }
      
      const box = hitbox.box;
      
      // @Hack: use actual bounding area
      box.calculateBounds();
      const minSubtileX = Math.max(Math.floor(_bounds.minX / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
      const maxSubtileX = Math.min(Math.floor(_bounds.maxX / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
      const minSubtileY = Math.max(Math.floor(_bounds.minY / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
      const maxSubtileY = Math.min(Math.floor(_bounds.maxY / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   
      // @Incomplete
      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            if (!layer.subtileIsWall(subtileX, subtileY)) {
               continue;
            }

            // @Garbage
            const tileCenterX = (subtileX + 0.5) * Settings.SUBTILE_SIZE;
            const tileCenterY = (subtileY + 0.5) * Settings.SUBTILE_SIZE;
            const tileBox = new RectangularBox(new Point(tileCenterX, tileCenterY), new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
            
            // Check if the tile is colliding
            const collisionResult = box.getCollisionResult(tileBox);
            if (collisionResult.isColliding) {
               resolveHardCollision(hitbox, collisionResult);
               hasMoved = true;
            }
         }
      }
   }
   return hasMoved;
}

const boxHasCollisionWithHitboxes = (box: Box, hitboxes: ReadonlyArray<Hitbox>, epsilon: number = 0): boolean => {
   for (let i = 0; i < hitboxes.length; i++) {
      const otherHitbox = hitboxes[i];
      const collisionResult = box.getCollisionResult(otherHitbox.box, epsilon);
      if (collisionResult.isColliding) {
         return true;
      }
   }
   return false;
}

// @Copynpaste
export function getHitboxesCollidingEntities(layer: Layer, hitboxes: ReadonlyArray<Hitbox>, epsilon: number = 0): Array<Entity> {
   const collidingEntities = new Array<Entity>();
   const seenEntityIDs = new Set<number>();
   
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
      const box = hitbox.box;

      box.calculateBounds();
      let minX = _bounds.minX;
      let maxX = _bounds.maxX;
      let minY = _bounds.minY;
      let maxY = _bounds.maxY;
      if (minX < 0) {
         minX = 0;
      }
      if (maxX >= Settings.WORLD_UNITS) {
         maxX = Settings.WORLD_UNITS - 1;
      }
      if (minY < 0) {
         minY = 0;
      }
      if (maxY >= Settings.WORLD_UNITS) {
         maxY = Settings.WORLD_UNITS - 1;
      }
      
      const minChunkX = Math.max(Math.floor(minX / Settings.CHUNK_UNITS), 0);
      const maxChunkX = Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
      const minChunkY = Math.max(Math.floor(minY / Settings.CHUNK_UNITS), 0);
      const maxChunkY = Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            for (let i = 0; i < chunk.entities.length; i++) {
               const entity = chunk.entities[i];
               if (seenEntityIDs.has(entity)) {
                  continue;
               }

               seenEntityIDs.add(entity);
               
               const entityTransformComponent = TransformComponentArray.getComponent(entity);
               if (boxHasCollisionWithHitboxes(box, entityTransformComponent.hitboxes, epsilon)) {
                  collidingEntities.push(entity);
               }
            }
         }
      }
   }

   return collidingEntities;
}

// @Cleanup: remove
const testCircularBox = new CircularBox(new Point(0, 0), new Point(0, 0), 0, 0);

// @Location
export function getEntitiesInRange(layer: Layer, x: number, y: number, range: number): Array<Entity> {
   const minChunkX = Math.max(Math.min(Math.floor((x - range) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((x + range) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((y - range) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((y + range) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);

   testCircularBox.radius = range;
   testCircularBox.position.x = x;
   testCircularBox.position.y = y;

   const visionRangeSquared = Math.pow(range, 2);
   
   const seenIDs = new Set<number>();
   const entities = new Array<Entity>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            // Don't add existing game objects
            if (seenIDs.has(entity)) {
               continue;
            }

            const transformComponent = TransformComponentArray.getComponent(entity);
            
            const entityHitbox = transformComponent.hitboxes[0];
            if (Math.pow(x - entityHitbox.box.position.x, 2) + Math.pow(y - entityHitbox.box.position.y, 2) <= visionRangeSquared) {
               entities.push(entity);
               seenIDs.add(entity);
               continue;
            }

            // If the test hitbox can 'see' any of the game object's hitboxes, it is visible
            for (const hitbox of transformComponent.hitboxes) {
               const collisionResult = testCircularBox.getCollisionResult(hitbox.box);
               if (collisionResult.isColliding) {
                  entities.push(entity);
                  seenIDs.add(entity);
                  break;
               }
            }
         }
      }  
   }

   return entities;
}

export function entitiesAreColliding(entity1: Entity, entity2: Entity): boolean {
   const transformComponent1 = TransformComponentArray.getComponent(entity1);
   const transformComponent2 = TransformComponentArray.getComponent(entity2);
   
   // AABB bounding area check
   if (transformComponent1.boundingAreaMinX > transformComponent2.boundingAreaMaxX || // minX(1) > maxX(2)
       transformComponent1.boundingAreaMaxX < transformComponent2.boundingAreaMinX || // maxX(1) < minX(2)
       transformComponent1.boundingAreaMinY > transformComponent2.boundingAreaMaxY || // minY(1) > maxY(2)
       transformComponent1.boundingAreaMaxY < transformComponent2.boundingAreaMinY) { // maxY(1) < minY(2)
      return false;
   }
   
   // More expensive hitbox check
   for (let i = 0; i < transformComponent1.hitboxes.length; i++) {
      const hitbox = transformComponent1.hitboxes[i];
      const box = hitbox.box;

      for (let j = 0; j < transformComponent2.hitboxes.length; j++) {
         const otherHitbox = transformComponent2.hitboxes[j];

         // If the objects are colliding, add the colliding object and this object
         if (collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, otherHitbox.collisionMask, otherHitbox.collisionBit) && box.getCollisionResult(otherHitbox.box).isColliding) {
            return true;
         }
      }
   }

   return false;
}