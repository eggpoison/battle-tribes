import { Settings, collisionBitsAreCompatible, Point, rotatePointAroundOrigin, Box, HitboxCollisionType, HitboxFlag, RectangularBox, CircularBox, Entity, CollisionResult, _bounds, EntityType, TileType, _point, CollisionGroup, collisionGroupsCanCollide, overrideCollisionGroup } from "webgl-test-shared";
import { TransformComponent, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { getEntityLayer, getEntityType } from "./world";
import Layer from "./Layer";
import { playerInstance } from "./player";
import { applyForce, getHitboxTile, getHitboxVelocity, Hitbox, setHitboxVelocity, translateHitbox } from "./hitboxes";
import { getEntityComponentArrays } from "./entity-component-types";
import { entityUsesClientInterp } from "./rendering/render-part-matrices";

type EntityCollisionPair = [affectedEntity: Entity, collidingEntity: Entity];

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
type GlobalCollisionInfo = Map<number, Array<EntityPairCollisionInfo>>;

// @HACK!!! @HACK!!!!!! HACK!!??!
// Convert the grass collision group from decoration to boring (so they can have collision events)
// overrideCollisionGroup(EntityType.grassStrand, CollisionGroup.default);

// Pair the colliding collision groups
const collisionGroupPairs: Array<[pushingGroup: CollisionGroup, pushedGroup: CollisionGroup]> = [];
for (let pushingGroup: CollisionGroup = 0; pushingGroup < CollisionGroup._LENGTH_; pushingGroup++) {
   for (let pushedGroup: CollisionGroup = 0; pushedGroup < CollisionGroup._LENGTH_; pushedGroup++) {
      if (collisionGroupsCanCollide(pushingGroup, pushedGroup)) {
         collisionGroupPairs.push([pushingGroup, pushedGroup]);
      }
   }
}

const resolveHardCollision = (affectedHitbox: Hitbox, collisionResult: CollisionResult): void => {
   // @Temporary: once it's guaranteed that overlap !== 0 this won't be needed.
   if (collisionResult.overlap.magnitude() === 0) {
      console.warn("my code is perilous " + Math.random());
      return;
   }

   // Transform the entity out of the hitbox
   translateHitbox(affectedHitbox, collisionResult.overlap.x, collisionResult.overlap.y);

   getHitboxVelocity(affectedHitbox);
   const previousVelocity = _point;
   
   // Kill all the velocity going into the hitbox
   const _bx = collisionResult.overlap.x / collisionResult.overlap.magnitude();
   const _by = collisionResult.overlap.y / collisionResult.overlap.magnitude();
   // @SPEED
   rotatePointAroundOrigin(_bx, _by, Math.PI/2);
   const bx = _point.x;
   const by = _point.y;
   const velocityProjectionCoeff = previousVelocity.x * bx + previousVelocity.y * by;
   const vx = bx * velocityProjectionCoeff;
   const vy = by * velocityProjectionCoeff;
   setHitboxVelocity(affectedHitbox, vx, vy);
}

const resolveSoftCollision = (affectedHitbox: Hitbox, pushingHitbox: Hitbox, collisionResult: CollisionResult): void => {
   const pushForce = Settings.ENTITY_PUSH_FORCE * pushingHitbox.mass;
   applyForce(affectedHitbox, collisionResult.overlap.x * pushForce, collisionResult.overlap.y * pushForce);
}

export function collide(entity: Entity, collidingEntity: Entity, collidingHitboxPairs: ReadonlyArray<HitboxCollisionPair>): void {
   const componentArrays = getEntityComponentArrays(getEntityType(entity));

   if (entity === playerInstance && entityUsesClientInterp(entity)) {
      for (let i = 0; i < collidingHitboxPairs.length; i++) {
         const pair = collidingHitboxPairs[i];
         const hitbox = pair.affectedHitbox;
         const collidingHitbox = pair.collidingHitbox;

         if (!hitbox.isStatic) {
            if (collidingHitbox.collisionType === HitboxCollisionType.hard) {
               resolveHardCollision(hitbox, pair.collisionResult);
            } else {
               resolveSoftCollision(hitbox, collidingHitbox, pair.collisionResult);
            }
         }
      }
   }

   for (let i = 0; i < collidingHitboxPairs.length; i++) {
      const pair = collidingHitboxPairs[i];
      const hitbox = pair.affectedHitbox;
      const collidingHitbox = pair.collidingHitbox;

      for (const componentArray of componentArrays) {
         if (componentArray.onCollision !== undefined) {
            componentArray.onCollision(entity, collidingEntity, hitbox, collidingHitbox);
         }
      }
   }
}

const markCollisions = (entityCollisionPairs: Array<EntityCollisionPair>, globalCollisionInfo: GlobalCollisionInfo, entity: Entity, collidingEntity: Entity, transformComponent: TransformComponent, collidingTransformComponent: TransformComponent): void => {
   // AABB bounding area check
   if (transformComponent.boundingAreaMinX > collidingTransformComponent.boundingAreaMaxX || // minX(1) > maxX(2)
       transformComponent.boundingAreaMaxX < collidingTransformComponent.boundingAreaMinX || // maxX(1) < minX(2)
       transformComponent.boundingAreaMinY > collidingTransformComponent.boundingAreaMaxY || // minY(1) > maxY(2)
       transformComponent.boundingAreaMaxY < collidingTransformComponent.boundingAreaMinY) { // maxY(1) < minY(2)
      return;
   }
   
   // Check if the collisions have already been marked
   // @Speed: perhaps modify the GlobalCollisionInfo type so we can skip if there was no collision. but see if that would actually make it faster
   const existingCollisionInfo = globalCollisionInfo.get(entity);
   if (existingCollisionInfo !== undefined) {
      for (let i = 0; i < existingCollisionInfo.length; i++) {
         const pairCollisionInfo = existingCollisionInfo[i];
         if (pairCollisionInfo.collidingEntity === collidingEntity) {
            return;
         }
      }
   }

   const hitboxCollisionPairs: Array<HitboxCollisionPair> = [];
   
   // More expensive hitbox check
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;

      for (const collidingHitbox of collidingTransformComponent.hitboxes) {
         const otherBox = collidingHitbox.box;

         if (!collisionBitsAreCompatible(hitbox.collisionMask, hitbox.collisionBit, collidingHitbox.collisionMask, collidingHitbox.collisionBit)) {
            continue;
         }
         
         // If the objects are colliding, add the colliding object and this object
         const collisionResult = box.getCollisionResult(otherBox);
         if (collisionResult.isColliding) {
            hitboxCollisionPairs.push({
               affectedHitbox: hitbox,
               collidingHitbox: collidingHitbox,
               collisionResult: collisionResult
            });
         }
      }
   }

   if (hitboxCollisionPairs.length > 0) {
      if (!globalCollisionInfo.has(entity)) {
         globalCollisionInfo.set(entity, []);
      }

      const pairCollisionInfo: EntityPairCollisionInfo = {
         collidingEntity: collidingEntity,
         collidingHitboxPairs: hitboxCollisionPairs
      };
      globalCollisionInfo.get(entity)!.push(pairCollisionInfo);

      entityCollisionPairs.push([entity, collidingEntity]);
   }
}

export function resolveEntityCollisions(layer: Layer): void {
   const entityCollisionPairs: Array<EntityCollisionPair> = [];
   const globalCollisionInfo: GlobalCollisionInfo = new Map();

   const LAYER_NUM_CHUNKS = Settings.WORLD_SIZE_CHUNKS * Settings.WORLD_SIZE_CHUNKS;
   
   for (let i = 0; i < collisionGroupPairs.length; i++) {
      const pair = collisionGroupPairs[i];
      const pushingGroup = pair[0];
      const pushedGroup = pair[1];

      const pushingChunks = layer.collisionGroupChunks[pushingGroup];
      const pushedChunks = layer.collisionGroupChunks[pushedGroup];

      // @Speed: This will have a whole lot of empty iterations cuz only a small part of the world is visible usually.
      for (let chunkIdx = 0; chunkIdx < LAYER_NUM_CHUNKS; chunkIdx++) {
         const pushingEntities = pushingChunks[chunkIdx];
         const pushedEntities = pushedChunks[chunkIdx];

         for (let j = 0; j < pushingEntities.length; j++) {
            const entity = pushingEntities[j];

            for (let k = 0; k < pushedEntities.length; k++) {
               const collidingEntity = pushedEntities[k];

               // @Speed: This check is only needed if the pushingGroup is the pushedGroup. And in that case we can actually just start k at j + 1 instead of 0, and this check won't be needed at all.
               if (entity === collidingEntity) {
                  continue;
               }

               const transformComponent = TransformComponentArray.getComponent(entity);
               const collidingTransformComponent = TransformComponentArray.getComponent(collidingEntity);

               // Make sure the entities aren't in the same carry heirarchy
               // @HACK @SPEED
               const firstHitbox = transformComponent.hitboxes[0];
               const firstCollidingHitbox = collidingTransformComponent.hitboxes[0];
               if (firstHitbox.rootEntity === firstCollidingHitbox.rootEntity) {
                  continue;
               }

               markCollisions(entityCollisionPairs, globalCollisionInfo, entity, collidingEntity, transformComponent, collidingTransformComponent);
            }
         }
      }
   }

   // Resolve collision pairs
   for (let i = 0; i < entityCollisionPairs.length; i++) {
      const pair = entityCollisionPairs[i];
      const entity = pair[0];
      const collidingEntity = pair[1];

      // @Speed? What does this even do? awful shittery
      let collisionInfo: EntityPairCollisionInfo | undefined;
      const collisionPairs = globalCollisionInfo.get(entity)!;
      for (let j = 0; j < collisionPairs.length; j++) {
         const currentCollisionInfo = collisionPairs[j];
         if (currentCollisionInfo.collidingEntity === collidingEntity) {
            collisionInfo = currentCollisionInfo;
            break;
         }
      }
      if (typeof collisionInfo === "undefined") {
         throw new Error();
      }

      collide(entity, collidingEntity, collisionInfo.collidingHitboxPairs);
   }
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

const boxHasCollisionWithHitboxes = (box: Box, hitboxes: ReadonlyArray<Hitbox>, epsilon = 0): boolean => {
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
export function getHitboxesCollidingEntities(layer: Layer, hitboxes: ReadonlyArray<Hitbox>, epsilon = 0): Array<Entity> {
   const collidingEntities: Array<Entity> = [];
   const seenEntities = new Set<number>();
   
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
               if (seenEntities.has(entity)) {
                  continue;
               }

               seenEntities.add(entity);
               
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
   const entities: Array<Entity> = [];
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

// @Location: on one hand, this doesn't really make sense to be here. should be in hitboxes.ts or something. On the other hand, hitboxes.ts has no good reason to import from collision.ts
export function hitboxIsInWater(hitbox: Hitbox): boolean {
   const tile = getHitboxTile(hitbox);
   if (tile.type !== TileType.water) {
      return false;
   }
   
   // If the hitbox is standing on a stepping stone they aren't in a river

   const layer = getEntityLayer(hitbox.entity);

   hitbox.box.calculateBounds();
   const minChunkX = Math.max(Math.min(Math.floor(_bounds.minX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor(_bounds.maxX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor(_bounds.minY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor(_bounds.maxY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const currentEntity of chunk.nonGrassEntities) {
            if (getEntityType(currentEntity) === EntityType.riverSteppingStone) {
               if (entitiesAreColliding(hitbox.entity, currentEntity)) {
                  return false;
               }
            }
         }
      }
   }

   return true;
}