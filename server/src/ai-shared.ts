import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { angle, curveWeight, Point, lerp, rotateXAroundPoint, rotateYAroundPoint, distance, distBetweenPointAndRectangle, TileIndex, getTileIndexIncludingEdges, assert, polarVec2, clamp } from "battletribes-shared/utils";
import Layer from "./Layer";
import { getEntityPathfindingGroupID } from "./pathfinding";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { ProjectileComponentArray } from "./components/ProjectileComponent";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { Box, boxIsCircular } from "battletribes-shared/boxes/boxes";
import { getEntityLayer, getEntityType } from "./world";
import { addHitboxAngularAcceleration, applyAccelerationFromGround, getHitboxVelocity, Hitbox, turnHitboxToAngle } from "./hitboxes";

const TURN_CONSTANT = Math.PI * Settings.DT_S;
const WALL_AVOIDANCE_MULTIPLIER = 1.5;
   
// @Cleanup: remove
const testCircularBox = new CircularBox(new Point(0, 0), new Point(0, 0), 0, 0);

// @Cleanup: Only used in tribesman.ts, so move there.
export function getClosestAccessibleEntity(entity: Entity, entities: ReadonlyArray<Entity>): Entity {
   if (entities.length === 0) {
      throw new Error("No entities in array");
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   // @Hack
   const entityHitbox = transformComponent.hitboxes[0];
   
   let closestEntity!: Entity;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const currentEntity of entities) {
      const currentEntityTransformComponent = TransformComponentArray.getComponent(currentEntity);
      // @Hack
      const currentEntityHitbox = currentEntityTransformComponent.hitboxes[0];
      
      const dist = entityHitbox.box.position.distanceTo(currentEntityHitbox.box.position);
      if (dist < minDistance) {
         closestEntity = currentEntity;
         minDistance = dist;
      }
   }
   return closestEntity;
}

/** Estimates the distance it will take for the hitbox to stop */
const estimateStopDistance = (hitbox: Hitbox): number => {
   const totalVelocityMagnitude = getHitboxVelocity(hitbox).magnitude();
   
   // @Incomplete: Hard-coded
   // Estimate time it will take for the entity to stop
   const stopTime = Math.pow(totalVelocityMagnitude, 0.8) / (3 * 50);
   const stopDistance = (Math.pow(stopTime, 2) + stopTime) * totalVelocityMagnitude;
   return stopDistance;
}

export function willStopAtDesiredDistance(hitbox: Hitbox, desiredDistance: number, distance: number): boolean {
   // If the entity has a desired distance from its target, try to stop at that desired distance
   const distanceToStop = estimateStopDistance(hitbox);
   return distance - distanceToStop <= desiredDistance;
}

export function getVelocityClosenessAdjustmentFactor(distance: number, startingAdjustmentDistance: number): number {
   const u = distance / startingAdjustmentDistance;
   if (u > 1) {
      return 1;
   } else if (u > 0) {
      return 0.3 + u * 0.7;
   } else if (u < -1) {
      return -1;
   } else {
      return -0.3 + u * 0.7;
   }
}

export function turnToPosition(entity: Entity, pos: Point, turnSpeed: number, turnDamping: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   // @Hack
   const entityHitbox = transformComponent.hitboxes[0];
   
   const targetDirection = entityHitbox.box.position.angleTo(pos);
   turnHitboxToAngle(entityHitbox, targetDirection, turnSpeed, turnDamping, false);
}

export function accelerateEntityToPosition(entity: Entity, pos: Point, acceleration: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   // @Hack
   const entityHitbox = transformComponent.hitboxes[0];

   const targetDirection = entityHitbox.box.position.angleTo(pos);

   applyAccelerationFromGround(entityHitbox, polarVec2(acceleration, targetDirection));
}

export function moveEntityToPosition(entity: Entity, x: number, y: number, acceleration: number, turnSpeed: number, turnDamping: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   // @Hack
   const entityHitbox = transformComponent.hitboxes[0];

   const targetDirection = angle(x - entityHitbox.box.position.x, y - entityHitbox.box.position.y);

   applyAccelerationFromGround(entityHitbox, polarVec2(acceleration, targetDirection));

   turnHitboxToAngle(entityHitbox, targetDirection, turnSpeed, turnDamping, false);
}
export function turnEntityToEntity(entity: Entity, targetEntity: Entity, turnSpeed: number, turnDamping: number): void {
   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   // @Hack
   const targetHitbox = targetTransformComponent.hitboxes[0];
   turnToPosition(entity, targetHitbox.box.position, turnDamping, turnSpeed);
}

// @Cleanup: unused?
export function moveEntityToEntity(entity: Entity, targetEntity: Entity, acceleration: number, turnSpeed: number): void {
   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   // @Hack
   const targetHitbox = targetTransformComponent.hitboxes[0];
   moveEntityToPosition(entity, targetHitbox.box.position.x, targetHitbox.box.position.y, acceleration, turnSpeed, 1);
}

export function hitboxIncludingChildrenHasPassedPosition(hitbox: Hitbox, pos: Point): boolean {
   const relativeX = hitbox.box.position.x - pos.x;
   const relativeY = hitbox.box.position.y - pos.y;

   const velocity = getHitboxVelocity(hitbox);
   const dotProduct = velocity.x * relativeX + velocity.y * relativeY;
   
   if (dotProduct > 0) {
      return true;
   }

   for (const childHitbox of hitbox.children) {
      // @INCOMPLETE: tethers??
      if (childHitbox.isPartOfParent && hitboxIncludingChildrenHasPassedPosition(childHitbox, pos)) {
         return true;
      }
   }
   
   return false;
}

// @HACK: instead of doing this, the hitbox-only function should also account for tethers
export function entityHasPassedPosition(entity: Entity, pos: Point): boolean {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const rootHitbox of transformComponent.rootHitboxes) {
      if (hitboxIncludingChildrenHasPassedPosition(rootHitbox, pos)) {
         return true;
      }
   }
   return false;
}

// @Cleanup @Robustness: Maybe separate this into 4 different functions? (for separation, alignment, etc.)
export function runHerdAI(entity: Entity, herdMembers: ReadonlyArray<Entity>, visionRange: number, turnRate: number, minSeparationDistance: number, separationInfluence: number, alignmentInfluence: number, cohesionInfluence: number): void {
   // 
   // Find the closest herd member and calculate other data
   // 

   const transformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = transformComponent.hitboxes[0];

   // Average angle of nearby entities
   let totalXVal: number = 0;
   let totalYVal: number = 0;

   let centerX = 0;
   let centerY = 0;

   let closestHerdMember: Entity | undefined;
   let minDist = Number.MAX_SAFE_INTEGER;
   let numHerdMembers = 0;
   for (let i = 0; i < herdMembers.length; i++) {
      const herdMember = herdMembers[i];

      const herdMemberTransformComponent = TransformComponentArray.getComponent(herdMember);
      // @HACK
      const herdMemberHitbox = herdMemberTransformComponent.hitboxes[0];

      const distance = entityHitbox.box.position.distanceTo(herdMemberHitbox.box.position);
      if (distance < minDist) {
         closestHerdMember = herdMember;
         minDist = distance;
      }

      totalXVal += Math.sin(herdMemberHitbox.box.angle);
      totalYVal += Math.cos(herdMemberHitbox.box.angle);

      centerX += herdMemberHitbox.box.position.x;
      centerY += herdMemberHitbox.box.position.y;
      numHerdMembers++;
   }
   if (typeof closestHerdMember === "undefined") {
      return;
   }

   centerX /= numHerdMembers;
   centerY /= numHerdMembers;

   // @Cleanup: We can probably clean up a lot of this code by using Entity's built in turn functions
   let angularVelocity = 0;
   
   const headingPrincipalValue = ((entityHitbox.box.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
   
   // SEPARATION
   // Steer away from herd members who are too close
   if (minDist < minSeparationDistance) {
      // Calculate the weight of the separation
      let weight = 1 - minDist / minSeparationDistance;
      weight = curveWeight(weight, 2, 0.2);
      
      const herdMemberTransformComponent = TransformComponentArray.getComponent(closestHerdMember);
      // @Hack
      const herdMemberHitbox = herdMemberTransformComponent.hitboxes[0];
      
      // @Speed: Garbage collection
      const distanceVector = herdMemberHitbox.box.position.convertToVector(entityHitbox.box.position);

      const clockwiseDist = (distanceVector.direction - entityHitbox.box.angle + Math.PI * 2) % (Math.PI * 2);
      const counterclockwiseDist = (Math.PI * 2) - clockwiseDist;

      if (clockwiseDist > counterclockwiseDist) {
         // Turn clockwise
         angularVelocity += turnRate * separationInfluence * weight * TURN_CONSTANT;
      } else {
         // Turn counterclockwise
         angularVelocity -= turnRate * separationInfluence * weight * TURN_CONSTANT;
      }
   }

   // ALIGNMENT
   // Orientate to nearby herd members' headings

   {
      let averageHeading = angle(totalXVal, totalYVal);
      if (averageHeading < 0) {
         averageHeading += Math.PI * 2;
      }

      // Calculate the weight of the alignment
      let angleDifference: number;
      if (averageHeading < headingPrincipalValue) {
         angleDifference = Math.min(Math.abs(averageHeading - headingPrincipalValue), Math.abs(averageHeading + Math.PI * 2 - headingPrincipalValue))
      } else {
         angleDifference = Math.min(Math.abs(headingPrincipalValue - averageHeading), Math.abs(headingPrincipalValue + Math.PI * 2 - averageHeading))
      }
      let weight = angleDifference / Math.PI;
      weight = curveWeight(weight, 2, 0.1);
      
      const clockwiseDist = (averageHeading - headingPrincipalValue + Math.PI * 2) % (Math.PI * 2);
      const counterclockwiseDist = (Math.PI * 2) - clockwiseDist;

      if (clockwiseDist < counterclockwiseDist) {
         // Turn clockwise
         angularVelocity += turnRate * alignmentInfluence * weight * TURN_CONSTANT;
      } else {
         // Turn counterclockwise
         angularVelocity -= turnRate * alignmentInfluence * weight * TURN_CONSTANT;
      }

   }

   // COHESION
   // Steer to move towards the local center of mass
   
   {
      // @Speed: Garbage collection
      
      // Calculate average position
      const centerOfMass = new Point(centerX, centerY);
      
      const toCenter = centerOfMass.convertToVector(entityHitbox.box.position);
      const directionToCenter = ((toCenter.direction % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)

      let weight = 1 - toCenter.magnitude / visionRange;
      weight = curveWeight(weight, 2, 0.2);

      const clockwiseDist = (directionToCenter - headingPrincipalValue + Math.PI * 2) % (Math.PI * 2);
      const counterclockwiseDist = (Math.PI * 2) - clockwiseDist;

      if (clockwiseDist > counterclockwiseDist) {
         // Turn clockwise
         angularVelocity -= turnRate * cohesionInfluence * weight * TURN_CONSTANT;
      } else {
         // Turn counterclockwise
         angularVelocity += turnRate * cohesionInfluence * weight * TURN_CONSTANT;
      }
   }

   // Wall avoidance (turn away from the nearest wall)

   {
   
      // Start by finding the direction to the nearest wall

      // The angle to try and get away from
      let directionToNearestWall!: number;
      let distanceFromWall!: number;

      // Top wall
      if (entityHitbox.box.position.y >= Settings.WORLD_SIZE_TILES * Settings.TILE_SIZE - visionRange) {
         directionToNearestWall = Math.PI / 2;
         distanceFromWall = Settings.WORLD_SIZE_TILES * Settings.TILE_SIZE - entityHitbox.box.position.y;
      // Right wall
      } else if (entityHitbox.box.position.x >= Settings.WORLD_SIZE_TILES * Settings.TILE_SIZE - visionRange) {
         directionToNearestWall = 0;
         distanceFromWall = Settings.WORLD_SIZE_TILES * Settings.TILE_SIZE - entityHitbox.box.position.x;
      // Bottom wall
      } else if (entityHitbox.box.position.y <= visionRange) {
         directionToNearestWall = Math.PI * 3 / 2;
         distanceFromWall = entityHitbox.box.position.y;
      // Left wall
      } else if (entityHitbox.box.position.x <= visionRange) {
         directionToNearestWall = Math.PI;
         distanceFromWall = entityHitbox.box.position.x;
      }

      if (typeof directionToNearestWall !== "undefined") {
         // Calculate the direction to turn
         const clockwiseDist = (directionToNearestWall - headingPrincipalValue + Math.PI * 2) % (Math.PI * 2);
         const counterclockwiseDist = (Math.PI * 2) - clockwiseDist;

         // Direction to turn (1 or -1)
         let turnDirection: number;
         if (counterclockwiseDist > clockwiseDist) {
            // Turn clockwise
            turnDirection = -1;
         } else {
            // Turn counterclockwise
            turnDirection = 1;
         }
         
         // Calculate turn direction weight
         let angleDifference: number;
         if (directionToNearestWall < headingPrincipalValue) {
            angleDifference = Math.min(Math.abs(directionToNearestWall - headingPrincipalValue), Math.abs(directionToNearestWall + Math.PI * 2 - headingPrincipalValue))
         } else {
            angleDifference = Math.min(Math.abs(headingPrincipalValue - directionToNearestWall), Math.abs(headingPrincipalValue + Math.PI * 2 - directionToNearestWall))
         }
         let turnDirectionWeight = angleDifference / Math.PI;
         turnDirectionWeight = curveWeight(turnDirectionWeight, 2, 0.2);

         // Calculate distance from wall weight
         let distanceWeight = 1 - distanceFromWall / visionRange;
         distanceWeight = curveWeight(distanceWeight, 2, 0.2);

         const wallAvoidanceInfluence = Math.max(separationInfluence, alignmentInfluence, cohesionInfluence) * WALL_AVOIDANCE_MULTIPLIER;
         angularVelocity += turnRate * turnDirection * wallAvoidanceInfluence * turnDirectionWeight * distanceWeight * TURN_CONSTANT;
      }
   }

   addHitboxAngularAcceleration(entityHitbox, angularVelocity);
}

/** Gets all tiles within a given distance from a position */
export function getPositionRadialTiles(layer: Layer, position: Point, radius: number): Array<TileIndex> {
   const tiles = new Array<TileIndex>();

   const minTileX = Math.max(Math.min(Math.floor((position.x - radius) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);
   const maxTileX = Math.max(Math.min(Math.floor((position.x + radius) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);
   const minTileY = Math.max(Math.min(Math.floor((position.y - radius) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);
   const maxTileY = Math.max(Math.min(Math.floor((position.y + radius) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);

   const radiusSquared = Math.pow(radius, 2);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         // @Incomplete: don't allow wandering into subtiles, but still allow wandering into where subtiles aren't (e.g. when there is only 1 subtile in a tile)
         // Don't try to wander to wall tiles
         // const isWall = layer.tileXYIsWall(tileX, tileY);
         // if (isWall) {
         //    continue;
         // }
         
         // Don't try to wander to water
         const tileType = layer.getTileXYType(tileX, tileY);
         if (tileType === TileType.water) {
            continue;
         }

         const distanceSquared = Math.pow(position.x - tileX * Settings.TILE_SIZE, 2) + Math.pow(position.y - tileY * Settings.TILE_SIZE, 2);
         if (distanceSquared <= radiusSquared) {
            const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
            tiles.push(tileIndex);
         }
      }
   }

   return tiles;
}

/** Gets all tiles within a given distance from a position */
export function getAllowedPositionRadialTiles(layer: Layer, position: Point, radius: number, validTileTargets: ReadonlyArray<TileType>): Array<TileIndex> {
   const tiles = new Array<TileIndex>();

   const minTileX = Math.max(Math.min(Math.floor((position.x - radius) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);
   const maxTileX = Math.max(Math.min(Math.floor((position.x + radius) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);
   const minTileY = Math.max(Math.min(Math.floor((position.y - radius) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);
   const maxTileY = Math.max(Math.min(Math.floor((position.y + radius) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1), 0);

   const radiusSquared = Math.pow(radius, 2);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         // @Incomplete: don't allow wandering into subtiles, but still allow wandering into where subtiles aren't (e.g. when there is only 1 subtile in a tile)
         // Don't try to wander to wall tiles
         // const isWall = layer.tileXYIsWall(tileX, tileY);
         // if (isWall) {
         //    continue;
         // }
         
         // Don't try to wander to disallowed tiles
         const tileType = layer.getTileXYType(tileX, tileY);
         if (validTileTargets.indexOf(tileType) === -1) {
            continue;
         }

         const distanceSquared = Math.pow(position.x - tileX * Settings.TILE_SIZE, 2) + Math.pow(position.y - tileY * Settings.TILE_SIZE, 2);
         if (distanceSquared <= radiusSquared) {
            const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
            tiles.push(tileIndex);
         }
      }
   }

   return tiles;
}

// @Copynpaste
export function boxIsInRange(position: Point, range: number, box: Box): boolean {
   testCircularBox.radius = range;
   testCircularBox.position.x = position.x;
   testCircularBox.position.y = position.y;

   return testCircularBox.getCollisionResult(box).isColliding;
}

export function entityIsInVisionRange(position: Point, visionRange: number, entity: Entity): boolean {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = transformComponent.hitboxes[0];

   if (Math.pow(position.x - entityHitbox.box.position.x, 2) + Math.pow(position.y - entityHitbox.box.position.y, 2) <= Math.pow(visionRange, 2)) {
      return true;
   }

   testCircularBox.radius = visionRange;
   testCircularBox.position.x = position.x;
   testCircularBox.position.y = position.y;

   // If the test hitbox can 'see' any of the game object's hitboxes, it is visible
   for (const hitbox of transformComponent.hitboxes) {
      const collisionResult = testCircularBox.getCollisionResult(hitbox.box);
      if (collisionResult.isColliding) {
         return true;
      }
   }

   return false;
}

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
            // @Hack
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

// @Cleanup: the getAngleDiff function already does this
export function getAngleDifference(angle1: number, angle2: number): number {
   let angleDifference = angle1 - angle2;
   if (angleDifference >= Math.PI) {
      angleDifference -= Math.PI * 2;
   } else if (angleDifference < -Math.PI) {
      angleDifference += Math.PI * 2;
   }
   return angleDifference;
}

export function getMinAngleToCircularBox(x: number, y: number, hitbox: CircularBox): number {
   const xDiff = hitbox.position.x - x;
   const yDiff = hitbox.position.y - y;

   const angleToHitboxCenter = angle(xDiff, yDiff);
   
   const leftXDiff = xDiff + hitbox.radius * Math.sin(angleToHitboxCenter - Math.PI/2);
   const leftYDiff = yDiff + hitbox.radius * Math.cos(angleToHitboxCenter - Math.PI/2);

   return angle(leftXDiff, leftYDiff);
}

export function getMaxAngleToCircularBox(x: number, y: number, box: CircularBox): number {
   const xDiff = box.position.x - x;
   const yDiff = box.position.y - y;

   const angleToHitboxCenter = angle(xDiff, yDiff);
   
   const rightXDiff = xDiff + box.radius * Math.sin(angleToHitboxCenter + Math.PI/2);
   const rightYDiff = yDiff + box.radius * Math.cos(angleToHitboxCenter + Math.PI/2);

   return angle(rightXDiff, rightYDiff);
}

const getAngleToVertexOffset = (x: number, y: number, hitboxX: number, hitboxY: number, vertexOffsetX: number, vertexOffsetY: number): number => {
   return angle(hitboxX + vertexOffsetX - x, hitboxY + vertexOffsetY - y);
}

export function getMinAngleToRectangularBox(x: number, y: number, box: RectangularBox): number {
   // @Speed!
   const topLeftVertexOffset = box.getTopLeftVertexOffset();
   const topRightVertexOffset = box.getTopLeftVertexOffset();
   
   const tl = getAngleToVertexOffset(x, y, box.position.x, box.position.y, topLeftVertexOffset.x, topLeftVertexOffset.y);
   const tr = getAngleToVertexOffset(x, y, box.position.x, box.position.y, topRightVertexOffset.x, topRightVertexOffset.y);
   const bl = getAngleToVertexOffset(x, y, box.position.x, box.position.y, -topLeftVertexOffset.x, -topLeftVertexOffset.y);
   const br = getAngleToVertexOffset(x, y, box.position.x, box.position.y, -topRightVertexOffset.x, -topRightVertexOffset.y);
   
   return Math.min(tl, tr, bl, br);
}

export function getMaxAngleToRectangularBox(x: number, y: number, box: RectangularBox): number {
   // @Speed!
   const topLeftVertexOffset = box.getTopLeftVertexOffset();
   const topRightVertexOffset = box.getTopLeftVertexOffset();
   
   const tl = getAngleToVertexOffset(x, y, box.position.x, box.position.y, topLeftVertexOffset.x, topLeftVertexOffset.y);
   const tr = getAngleToVertexOffset(x, y, box.position.x, box.position.y, topRightVertexOffset.x, topRightVertexOffset.y);
   const bl = getAngleToVertexOffset(x, y, box.position.x, box.position.y, -topLeftVertexOffset.x, -topLeftVertexOffset.y);
   const br = getAngleToVertexOffset(x, y, box.position.x, box.position.y, -topRightVertexOffset.x, -topRightVertexOffset.y);
   
   return Math.max(tl, tr, bl, br);
}

/** Calculates the minimum angle startAngle would need to turn to reach endAngle */
export function getClockwiseAngleDistance(startAngle: number, endAngle: number): number {
   let angle = endAngle - startAngle;
   if (angle < 0) {
      angle += 2 * Math.PI;
   }
   return angle;
}

export function angleIsInRange(angle: number, minAngle: number, maxAngle: number): boolean {
   const distFromMinToAngle = getClockwiseAngleDistance(minAngle, angle);
   const distFromMinToMax = getClockwiseAngleDistance(minAngle, maxAngle);

   // The angle is in the range if the distance to the angle is shorter than the distance to the max
   return distFromMinToAngle < distFromMinToMax;
}

export function getTurnSmoothingMultiplier(entity: Entity, targetDirection: number): number {
   const transformComponent = TransformComponentArray.getComponent(entity);
   // @Hack
   const hitbox = transformComponent.hitboxes[0];
   const dotProduct = Math.sin(hitbox.box.angle) * Math.sin(targetDirection) + Math.cos(hitbox.box.angle) * Math.cos(targetDirection);
   if (dotProduct <= 0) {
      // Turn at full speed when facing away from the direction
      return 1;
   } else {
      // Turn slower the closer the entity is to their desired direction
      return lerp(1, 0.4, dotProduct);
   }
}

export function turnAngle(angle: number, targetAngle: number, turnSpeed: number): number {
   // @Copynpaste from turnEntity
   
   const clockwiseDist = getClockwiseAngleDistance(angle, targetAngle);
   if (clockwiseDist < Math.PI) {
      // Turn clockwise
      let result = angle + turnSpeed * Settings.DT_S;
      // @Incomplete: Will this sometimes cause snapping?
      if (turnSpeed * Settings.DT_S >= clockwiseDist) {
         result = targetAngle;
      }
      return result;
   } else {
      const anticlockwiseDist = 2 * Math.PI - clockwiseDist;
      
      // Turn counterclockwise
      let result = angle - turnSpeed * Settings.DT_S;
      if (turnSpeed * Settings.DT_S >= anticlockwiseDist) {
         result = targetAngle;
      }
      return result;
   }
}

const lineIntersectsRectangularHitbox = (lineX1: number, lineY1: number, lineX2: number, lineY2: number, rect: RectangularBox): boolean => {
   // Rotate the line and rectangle to axis-align the rectangle
   const rectAngle = rect.angle;
   const x1 = rotateXAroundPoint(lineX1, lineY1, rect.position.x, rect.position.y, -rectAngle);
   const y1 = rotateYAroundPoint(lineX1, lineY1, rect.position.x, rect.position.y, -rectAngle);
   const x2 = rotateXAroundPoint(lineX2, lineY2, rect.position.x, rect.position.y, -rectAngle);
   const y2 = rotateYAroundPoint(lineX2, lineY2, rect.position.x, rect.position.y, -rectAngle);

   const xMin = Math.min(x1, x2);
   const xMax = Math.max(x1, x2);
   const yMin = Math.min(y1, y2);
   const yMax = Math.max(y1, y2);
   
   if (rect.position.x - rect.width / 2 > xMax || rect.position.x + rect.width / 2 < xMin) {
      return false;
   } 
   
   if (rect.position.y - rect.height / 2 > yMax || rect.position.y + rect.height / 2 < yMin) {
      return false;
   }

   const yAtRectLeft = y1 + (y2 - y1) * ((rect.position.x - rect.width / 2 - x1) / (x2 - x1));
   const yAtRectRight = y1 + (y2 - y1) * ((rect.position.x + rect.width / 2 - x1) / (x2 - x1));

   if (rect.position.y - rect.height / 2 > yAtRectLeft && rect.position.y - rect.height / 2 > yAtRectRight) {
      return false;
   }

   if (rect.position.y + rect.height / 2 < yAtRectLeft && rect.position.y + rect.height / 2 < yAtRectRight) {
      return false;
   }

   return true;
}

const entityAffectsLineOfSight = (entity: Entity): boolean => {
   // @Hack
   return !ProjectileComponentArray.hasComponent(entity) && getEntityType(entity) !== EntityType.grassStrand && getEntityType(entity) !== EntityType.decoration;
}

const lineIntersectsCircularHitbox = (lineX1: number, lineY1: number, lineX2: number, lineY2: number, box: CircularBox): boolean => {
   // https://stackoverflow.com/questions/67116296/is-this-code-for-determining-if-a-circle-and-line-segment-intersects-correct
   
   const circleX = box.position.x;
   const circleY = box.position.y;
   
   const x_linear = lineX2 - lineX1;
   const x_constant = lineX1 - circleX;
   const y_linear = lineY2 - lineY1;
   const y_constant = lineY1 - circleY;
   const a = x_linear * x_linear + y_linear * y_linear;
   const half_b = x_linear * x_constant + y_linear * y_constant;
   const c = x_constant * x_constant + y_constant * y_constant - box.radius * box.radius;
   return (
      half_b * half_b >= a * c &&
      (-half_b <= a || c + half_b + half_b + a <= 0) &&
      (half_b <= 0 || c <= 0)
   );
}

const hitboxOrChildrenIntersectLineOfSight = (hitbox: Hitbox, rayStartX: number, rayStartY: number, rayEndX: number, rayEndY: number): boolean => {
   const box = hitbox.box;
   
   if (boxIsCircular(box)) {
      if (lineIntersectsCircularHitbox(rayStartX, rayStartY, rayEndX, rayEndY, box)) {
         return true;
      }
   } else {
      if (lineIntersectsRectangularHitbox(rayStartX, rayStartY, rayEndX, rayEndY, box)) {
         return true;
      }
   }

   for (const childHitbox of hitbox.children) {
      if (childHitbox.isPartOfParent && hitboxOrChildrenIntersectLineOfSight(childHitbox, rayStartX, rayStartY, rayEndX, rayEndY)) {
         return true;
      }
   }

   return false;
}

export function entityIsInLineOfSight(sightRayStart: Point, targetEntity: Entity, ignoredEntity: Entity, ignoredPathfindingGroupID?: number): boolean {
   // @Bug @Hack
   const targetEntityTransformComponent = TransformComponentArray.getComponent(targetEntity);
   const targetEntityHitbox = targetEntityTransformComponent.hitboxes[0];

   const ignoredEntityTransformComponent = TransformComponentArray.getComponent(ignoredEntity);
   const ignoredEntityHitbox = ignoredEntityTransformComponent.hitboxes[0];

   const layer = getEntityLayer(targetEntity);

   const rayStartX = sightRayStart.x;
   const rayStartY = sightRayStart.y;
   const rayEndX = targetEntityHitbox.box.position.x;
   const rayEndY = targetEntityHitbox.box.position.y;

   // 
   // Check for entity hitboxes in the path between
   // 

   // @Speed: don't check chunks in the full square, check chunks in the line!!

   const minX = Math.min(rayStartX, rayEndX);
   const maxX = Math.max(rayStartX, rayEndX);
   const minY = Math.min(rayStartY, rayEndY);
   const maxY = Math.max(rayStartY, rayEndY);

   const minChunkX = clamp(Math.floor(minX / Settings.CHUNK_UNITS), 0, Settings.WORLD_SIZE_CHUNKS - 1);
   const maxChunkX = clamp(Math.floor(maxX / Settings.CHUNK_UNITS), 0, Settings.WORLD_SIZE_CHUNKS - 1);
   const minChunkY = clamp(Math.floor(minY / Settings.CHUNK_UNITS), 0, Settings.WORLD_SIZE_CHUNKS - 1);
   const maxChunkY = clamp(Math.floor(maxY / Settings.CHUNK_UNITS), 0, Settings.WORLD_SIZE_CHUNKS - 1);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);

         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            const pathfindingGroupID = getEntityPathfindingGroupID(entity);
            if (entity === targetEntity || pathfindingGroupID === ignoredPathfindingGroupID || !entityAffectsLineOfSight(entity)) {
               continue;
            }

            const transformComponent = TransformComponentArray.getComponent(entity);
            // @Hack: all of this
            const firstHitbox = transformComponent.hitboxes[0];
            if (firstHitbox.rootEntity === ignoredEntityHitbox.rootEntity) {
               continue;
            }

            // @HACK @HARDCODED!! literally only works for moss!!
            if (getEntityType(entity) === EntityType.moss) {
               continue;
            }
            
            for (const hitbox of transformComponent.rootHitboxes) {
               if (hitboxOrChildrenIntersectLineOfSight(hitbox, rayStartX, rayStartY, rayEndX, rayEndY)) {
                  return false;
               }
            }
         }
      }
   }
   
   // Check for walls in between
   if (layer.raytraceHasWallSubtile(rayStartX, rayStartY, rayEndX, rayEndY)) {
      return false;
   }

   return true;
}

export function getDistanceFromPointToHitbox(point: Readonly<Point>, hitbox: Hitbox): number {
   const box = hitbox.box;
   
   if (boxIsCircular(box)) {
      const rawDistance = distance(point.x, point.y, box.position.x, box.position.y);
      return rawDistance - box.radius;
   } else {
      return distBetweenPointAndRectangle(point.x, point.y, box.position, box.width, box.height, box.angle);
   }
}

export function getDistanceFromPointToHitboxIncludingChildren(point: Readonly<Point>, hitbox: Hitbox): number {
   let minDist = getDistanceFromPointToHitbox(point, hitbox);

   for (const child of hitbox.children) {
      if (child.isPartOfParent) {
         const dist = getDistanceFromPointToHitboxIncludingChildren(point, child);
         if (dist < minDist) {
            minDist = dist;
         }
      }
   }

   return minDist;
}

export function getDistanceFromPointToEntity(point: Readonly<Point>, transformComponent: TransformComponent): number {
   let minDist = Number.MAX_SAFE_INTEGER;
   for (const hitbox of transformComponent.hitboxes) {
      const dist = getDistanceFromPointToHitboxIncludingChildren(point, hitbox);
      if (dist < minDist) {
         minDist = dist;
      }
   }
   return minDist;
}

export function snapAngleToOtherAngle(angle: number, snapAngle: number): number {
   let snappedAngle = snapAngle - angle;

   // Snap to nearest PI/2 interval
   snappedAngle = Math.round(snappedAngle / Math.PI*2) * Math.PI/2;

   snappedAngle += angle;
   return snappedAngle;
}

/** Calculates how closely 2 angles are aligned */
export function findAngleAlignment(a1: number, a2: number): number {
   const x1 = Math.sin(a1);
   const y1 = Math.cos(a1);
   const x2 = Math.sin(a2);
   const y2 = Math.cos(a2);

   const dot = x1 * x2 + y1 * y2;
   return dot * 0.5 + 0.5;
}

// @Incomplete: this is ripped from chatgpt and i dont think it works lmao
export function computeInterceptAngle(monsterPos: Point, monsterSpeed: number, targetPos: Point, targetVelocity: Point): number | null {
  const dx = targetPos.x - monsterPos.x;
  const dy = targetPos.y - monsterPos.y;
  const dvx = targetVelocity.x;
  const dvy = targetVelocity.y;

  const a = dvx * dvx + dvy * dvy - monsterSpeed * monsterSpeed;
  const b = 2 * (dx * dvx + dy * dvy);
  const c = dx * dx + dy * dy;

  // Quadratic equation: at² + bt + c = 0
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0 || Math.abs(a) < 1e-5) {
    // No valid solution: monster too slow or almost same direction
    return null;
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b + sqrtDisc) / (2 * a);
  const t2 = (-b - sqrtDisc) / (2 * a);

  // Choose the smallest positive time
  const t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
  if (t < 0) return null;

  // Interception point
  const interceptX = targetPos.x + targetVelocity.x * t;
  const interceptY = targetPos.y + targetVelocity.y * t;

  return monsterPos.angleTo(new Point(interceptX, interceptY));
}

/**
 * @param predictionTime Prediction time in seconds
 */
export function predictHitboxPos(hitbox: Hitbox, predictionTime: number): Point {
   const vel = getHitboxVelocity(hitbox);
   
   const x = hitbox.box.position.x + vel.x * predictionTime;
   const y = hitbox.box.position.y + vel.y * predictionTime;
   return new Point(x, y);
}