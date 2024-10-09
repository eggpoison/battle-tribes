import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { angle, curveWeight, Point, lerp, rotateXAroundPoint, rotateYAroundPoint, distance, distBetweenPointAndRectangle, TileIndex } from "battletribes-shared/utils";
import Layer, { getTileIndexIncludingEdges } from "./Layer";
import { PhysicsComponent, PhysicsComponentArray } from "./components/PhysicsComponent";
import { getEntityPathfindingGroupID } from "./pathfinding";
import { TransformComponentArray } from "./components/TransformComponent";
import { ProjectileComponentArray } from "./components/ProjectileComponent";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { boxIsCircular } from "battletribes-shared/boxes/boxes";
import { getEntityLayer, getEntityType } from "./world";

const TURN_CONSTANT = Math.PI / Settings.TPS;
const WALL_AVOIDANCE_MULTIPLIER = 1.5;
   
// @Cleanup: remove
const testCircularBox = new CircularBox(new Point(0, 0), 0, -1);

// @Cleanup: Only used in tribesman.ts, so move there.
export function getClosestAccessibleEntity(entity: EntityID, entities: ReadonlyArray<EntityID>): EntityID {
   if (entities.length === 0) {
      throw new Error("No entities in array");
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   
   let closestEntity!: EntityID;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const currentEntity of entities) {
      const currentEntityTransformComponent = TransformComponentArray.getComponent(currentEntity);
      
      const dist = transformComponent.position.calculateDistanceBetween(currentEntityTransformComponent.position);
      if (dist < minDistance) {
         closestEntity = currentEntity;
         minDistance = dist;
      }
   }
   return closestEntity;
}

/** Estimates the distance it will take for the entity to stop */
const estimateStopDistance = (physicsComponent: PhysicsComponent): number => {
   // Get the total velocity length
   const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
   const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
   const totalVelocityMagnitude = Math.sqrt(vx * vx + vy * vy);
   
   // @Incomplete: Hard-coded
   // Estimate time it will take for the entity to stop
   const stopTime = Math.pow(totalVelocityMagnitude, 0.8) / (3 * 50);
   const stopDistance = (Math.pow(stopTime, 2) + stopTime) * totalVelocityMagnitude;
   return stopDistance;
}

export function willStopAtDesiredDistance(physicsComponent: PhysicsComponent, desiredDistance: number, distance: number): boolean {
   // If the entity has a desired distance from its target, try to stop at that desired distance
   const stopDistance = estimateStopDistance(physicsComponent);
   return distance - stopDistance <= desiredDistance;
}

export function stopEntity(physicsComponent: PhysicsComponent): void {
   physicsComponent.acceleration.x = 0;
   physicsComponent.acceleration.y = 0;
}

export function turnToPosition(entity: EntityID, x: number, y: number, turnSpeed: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   const targetDirection = angle(x - transformComponent.position.x, y - transformComponent.position.y);

   physicsComponent.targetRotation = targetDirection;
   physicsComponent.turnSpeed = turnSpeed;
}

export function stopTurning(physicsComponent: PhysicsComponent): void {
   physicsComponent.turnSpeed = 0;
}

export function moveEntityToPosition(entity: EntityID, positionX: number, positionY: number, acceleration: number, turnSpeed: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   const targetDirection = angle(positionX - transformComponent.position.x, positionY - transformComponent.position.y);

   physicsComponent.acceleration.x = acceleration * Math.sin(targetDirection);
   physicsComponent.acceleration.y = acceleration * Math.cos(targetDirection);
   physicsComponent.targetRotation = targetDirection;
   physicsComponent.turnSpeed = turnSpeed;
}
export function turnEntityToEntity(entity: EntityID, targetEntity: EntityID, turnSpeed: number): void {
   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   turnToPosition(entity, targetTransformComponent.position.x, targetTransformComponent.position.y, turnSpeed);
}

// @Cleanup: unused?
export function moveEntityToEntity(entity: EntityID, targetEntity: EntityID, acceleration: number, turnSpeed: number): void {
   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   moveEntityToPosition(entity, targetTransformComponent.position.x, targetTransformComponent.position.y, acceleration, turnSpeed);
}

export function entityHasReachedPosition(entity: EntityID, positionX: number, positionY: number): boolean {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   
   const relativeX = transformComponent.position.x - positionX;
   const relativeY = transformComponent.position.y - positionY;

   const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
   const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
   const dotProduct = vx * relativeX + vy * relativeY;
   
   return dotProduct > 0;
}

// @Cleanup @Robustness: Maybe separate this into 4 different functions? (for separation, alignment, etc.)
export function runHerdAI(entity: EntityID, herdMembers: ReadonlyArray<EntityID>, visionRange: number, turnRate: number, minSeparationDistance: number, separationInfluence: number, alignmentInfluence: number, cohesionInfluence: number): void {
   // 
   // Find the closest herd member and calculate other data
   // 

   const transformComponent = TransformComponentArray.getComponent(entity);

   // Average angle of nearby entities
   let totalXVal: number = 0;
   let totalYVal: number = 0;

   let centerX = 0;
   let centerY = 0;

   let closestHerdMember: EntityID | undefined;
   let minDist = Number.MAX_SAFE_INTEGER;
   let numHerdMembers = 0;
   for (let i = 0; i < herdMembers.length; i++) {
      const herdMember = herdMembers[i];

      const herdMemberTransformComponent = TransformComponentArray.getComponent(herdMember);

      const distance = transformComponent.position.calculateDistanceBetween(herdMemberTransformComponent.position);
      if (distance < minDist) {
         closestHerdMember = herdMember;
         minDist = distance;
      }

      totalXVal += Math.sin(herdMemberTransformComponent.rotation);
      totalYVal += Math.cos(herdMemberTransformComponent.rotation);

      centerX += herdMemberTransformComponent.position.x;
      centerY += herdMemberTransformComponent.position.y;
      numHerdMembers++;
   }
   if (typeof closestHerdMember === "undefined") {
      return;
   }

   centerX /= numHerdMembers;
   centerY /= numHerdMembers;

   // @Cleanup: We can probably clean up a lot of this code by using Entity's built in turn functions
   let angularVelocity = 0;
   
   const headingPrincipalValue = ((transformComponent.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
   
   // SEPARATION
   // Steer away from herd members who are too close
   if (minDist < minSeparationDistance) {
      // Calculate the weight of the separation
      let weight = 1 - minDist / minSeparationDistance;
      weight = curveWeight(weight, 2, 0.2);
      
      const herdMemberTransformComponent = TransformComponentArray.getComponent(closestHerdMember);
      
      // @Speed: Garbage collection
      const distanceVector = herdMemberTransformComponent.position.convertToVector(transformComponent.position);

      const clockwiseDist = (distanceVector.direction - transformComponent.rotation + Math.PI * 2) % (Math.PI * 2);
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
      
      const toCenter = centerOfMass.convertToVector(transformComponent.position);
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

      // The rotation to try and get away from
      let directionToNearestWall!: number;
      let distanceFromWall!: number;

      // Top wall
      if (transformComponent.position.y >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - visionRange) {
         directionToNearestWall = Math.PI / 2;
         distanceFromWall = Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - transformComponent.position.y;
      // Right wall
      } else if (transformComponent.position.x >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - visionRange) {
         directionToNearestWall = 0;
         distanceFromWall = Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - transformComponent.position.x;
      // Bottom wall
      } else if (transformComponent.position.y <= visionRange) {
         directionToNearestWall = Math.PI * 3 / 2;
         distanceFromWall = transformComponent.position.y;
      // Left wall
      } else if (transformComponent.position.x <= visionRange) {
         directionToNearestWall = Math.PI;
         distanceFromWall = transformComponent.position.x;
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

   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   physicsComponent.angularVelocity = angularVelocity;
}

/** Gets all tiles within a given distance from a position */
export function getPositionRadialTiles(layer: Layer, position: Point, radius: number): Array<TileIndex> {
   const tiles = new Array<TileIndex>();

   const minTileX = Math.max(Math.min(Math.floor((position.x - radius) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const maxTileX = Math.max(Math.min(Math.floor((position.x + radius) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const minTileY = Math.max(Math.min(Math.floor((position.y - radius) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const maxTileY = Math.max(Math.min(Math.floor((position.y + radius) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);

   const radiusSquared = Math.pow(radius, 2);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         // Don't try to wander to wall tiles
         const isWall = layer.tileXYIsWall(tileX, tileY);
         if (isWall) {
            continue;
         }
         
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

   const minTileX = Math.max(Math.min(Math.floor((position.x - radius) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const maxTileX = Math.max(Math.min(Math.floor((position.x + radius) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const minTileY = Math.max(Math.min(Math.floor((position.y - radius) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);
   const maxTileY = Math.max(Math.min(Math.floor((position.y + radius) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1), 0);

   const radiusSquared = Math.pow(radius, 2);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         // Don't try to wander to wall tiles
         const isWall = layer.tileXYIsWall(tileX, tileY);
         if (isWall) {
            continue;
         }
         
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

export function entityIsInVisionRange(position: Point, visionRange: number, entity: EntityID): boolean {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   if (Math.pow(position.x - transformComponent.position.x, 2) + Math.pow(position.y - transformComponent.position.y, 2) <= Math.pow(visionRange, 2)) {
      return true;
   }

   testCircularBox.radius = visionRange;
   testCircularBox.position.x = position.x;
   testCircularBox.position.y = position.y;

   // If the test hitbox can 'see' any of the game object's hitboxes, it is visible
   for (const hitbox of transformComponent.hitboxes) {
      if (testCircularBox.isColliding(hitbox.box)) {
         return true;
      }
   }

   return false;
}

export function getEntitiesInRange(layer: Layer, x: number, y: number, range: number): Array<EntityID> {
   const minChunkX = Math.max(Math.min(Math.floor((x - range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((x + range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((y - range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((y + range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   testCircularBox.radius = range;
   testCircularBox.position.x = x;
   testCircularBox.position.y = y;

   const visionRangeSquared = Math.pow(range, 2);
   
   const seenIDs = new Set<number>();
   const entities = new Array<EntityID>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            // Don't add existing game objects
            if (seenIDs.has(entity)) {
               continue;
            }

            const transformComponent = TransformComponentArray.getComponent(entity);
            if (Math.pow(x - transformComponent.position.x, 2) + Math.pow(y - transformComponent.position.y, 2) <= visionRangeSquared) {
               entities.push(entity);
               seenIDs.add(entity);
               continue;
            }

            // If the test hitbox can 'see' any of the game object's hitboxes, it is visible
            for (const hitbox of transformComponent.hitboxes) {
               if (testCircularBox.isColliding(hitbox.box)) {
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

export function cleanAngle(angle: number): number {
   return angle - 2 * Math.PI * Math.floor(angle / (2 * Math.PI));
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
   const tl = getAngleToVertexOffset(x, y, box.position.x, box.position.y, box.topLeftVertexOffset.x, box.topLeftVertexOffset.y);
   const tr = getAngleToVertexOffset(x, y, box.position.x, box.position.y, box.topRightVertexOffset.x, box.topRightVertexOffset.y);
   const bl = getAngleToVertexOffset(x, y, box.position.x, box.position.y, -box.topLeftVertexOffset.x, -box.topLeftVertexOffset.y);
   const br = getAngleToVertexOffset(x, y, box.position.x, box.position.y, -box.topRightVertexOffset.x, -box.topRightVertexOffset.y);
   
   return Math.min(tl, tr, bl, br);
}

export function getMaxAngleToRectangularBox(x: number, y: number, box: RectangularBox): number {
   const tl = getAngleToVertexOffset(x, y, box.position.x, box.position.y, box.topLeftVertexOffset.x, box.topLeftVertexOffset.y);
   const tr = getAngleToVertexOffset(x, y, box.position.x, box.position.y, box.topRightVertexOffset.x, box.topRightVertexOffset.y);
   const bl = getAngleToVertexOffset(x, y, box.position.x, box.position.y, -box.topLeftVertexOffset.x, -box.topLeftVertexOffset.y);
   const br = getAngleToVertexOffset(x, y, box.position.x, box.position.y, -box.topRightVertexOffset.x, -box.topRightVertexOffset.y);
   
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

export function getTurnSmoothingMultiplier(entity: EntityID, targetDirection: number): number {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const dotProduct = Math.sin(transformComponent.rotation) * Math.sin(targetDirection) + Math.cos(transformComponent.rotation) * Math.cos(targetDirection);
   if (dotProduct <= 0) {
      // Turn at full speed when facing away from the direction
      return 1;
   } else {
      // Turn slower the closer the entity is to their desired direction
      return lerp(1, 0.4, dotProduct);
   }
}

export function turnAngle(angle: number, targetAngle: number, turnSpeed: number): number {
   const clockwiseDist = getClockwiseAngleDistance(angle, targetAngle);
   if (clockwiseDist < Math.PI) {
      // Turn clockwise
      let result = angle + turnSpeed * Settings.I_TPS;
      // @Incomplete: Will this sometimes cause snapping?
      if (result > targetAngle) {
         result = targetAngle;
      }
      return result;
   } else {
      // Turn counterclockwise
      let result = angle - turnSpeed * Settings.I_TPS;
      if (result < targetAngle) {
         result = targetAngle;
      }
      return result;
   }
}

const lineIntersectsRectangularHitbox = (lineX1: number, lineY1: number, lineX2: number, lineY2: number, rect: RectangularBox): boolean => {
   // Rotate the line and rectangle to axis-align the rectangle
   const rectRotation = rect.rotation;
   const x1 = rotateXAroundPoint(lineX1, lineY1, rect.position.x, rect.position.y, -rectRotation);
   const y1 = rotateYAroundPoint(lineX1, lineY1, rect.position.x, rect.position.y, -rectRotation);
   const x2 = rotateXAroundPoint(lineX2, lineY2, rect.position.x, rect.position.y, -rectRotation);
   const y2 = rotateYAroundPoint(lineX2, lineY2, rect.position.x, rect.position.y, -rectRotation);

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

const entityAffectsLineOfSight = (entity: EntityID): boolean => {
   return !ProjectileComponentArray.hasComponent(entity);
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

const entityIntersectsLineOfSight = (entity: EntityID, originEntity: EntityID, targetEntity: EntityID): boolean => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const originEntityTransformComponent = TransformComponentArray.getComponent(originEntity);
   const targetEntityTransformComponent = TransformComponentArray.getComponent(targetEntity);
   
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      const box = hitbox.box;

      // @Hack @Cleanup
      // Ignore the horizontal hitboxes of embrasures
      if (getEntityType(entity) === EntityType.embrasure && i > 1) {
         continue;
      }

      if (boxIsCircular(box)) {
         if (lineIntersectsCircularHitbox(originEntityTransformComponent.position.x, originEntityTransformComponent.position.y, targetEntityTransformComponent.position.x, targetEntityTransformComponent.position.y, box)) {
            return false;
         }
      } else {
         if (lineIntersectsRectangularHitbox(originEntityTransformComponent.position.x, originEntityTransformComponent.position.y, targetEntityTransformComponent.position.x, targetEntityTransformComponent.position.y, box)) {
            return true;
         }
      }
   }

   return false;
}

export function entityIsInLineOfSight(originEntity: EntityID, targetEntity: EntityID, ignoredPathfindingGroupID: number): boolean {
   const originEntityTransformComponent = TransformComponentArray.getComponent(originEntity);
   const targetEntityTransformComponent = TransformComponentArray.getComponent(targetEntity);
   const layer = getEntityLayer(originEntity);

   // 
   // Check for entity hitboxes in the path between
   // 

   const minX = Math.min(originEntityTransformComponent.position.x, targetEntityTransformComponent.position.x);
   const maxX = Math.max(originEntityTransformComponent.position.x, targetEntityTransformComponent.position.x);
   const minY = Math.min(originEntityTransformComponent.position.y, targetEntityTransformComponent.position.y);
   const maxY = Math.max(originEntityTransformComponent.position.y, targetEntityTransformComponent.position.y);

   const minChunkX = Math.floor(minX / Settings.CHUNK_UNITS);
   const maxChunkX = Math.floor(maxX / Settings.CHUNK_UNITS);
   const minChunkY = Math.floor(minY / Settings.CHUNK_UNITS);
   const maxChunkY = Math.floor(maxY / Settings.CHUNK_UNITS);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);

         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            const pathfindingGroupID = getEntityPathfindingGroupID(entity);
            if (entity === originEntity || entity === targetEntity || pathfindingGroupID === ignoredPathfindingGroupID || !entityAffectsLineOfSight(getEntityType(entity)!)) {
               continue;
            }

            if (entityIntersectsLineOfSight(entity, originEntity, targetEntity)) {
               return false;
            }
         }
      }
   }
   
   // Check for walls in between
   if (layer.raytraceHasWallTile(originEntityTransformComponent.position.x, originEntityTransformComponent.position.y, targetEntityTransformComponent.position.x, targetEntityTransformComponent.position.y)) {
      return false;
   }

   return true;
}

export function getDistanceFromPointToEntity(point: Point, entity: EntityID): number {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   let minDistance = Math.sqrt(Math.pow(point.x - transformComponent.position.x, 2) + Math.pow(point.y - transformComponent.position.y, 2));
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;
      
      if (boxIsCircular(box)) {
         const rawDistance = distance(point.x, point.y, box.position.x, box.position.y);
         const hitboxDistance = rawDistance - box.radius;
         if (hitboxDistance < minDistance) {
            minDistance = hitboxDistance;
         }
      } else {
         const dist = distBetweenPointAndRectangle(point.x, point.y, box.position, box.width, box.height, box.rotation);
         if (dist < minDistance) {
            minDistance = dist;
         }
      }
   }
   return minDistance;
}

export function snapRotationToOtherAngle(rotation: number, snapAngle: number): number {
   let snapRotation = snapAngle - rotation;

   // Snap to nearest PI/2 interval
   snapRotation = Math.round(snapRotation / Math.PI*2) * Math.PI/2;

   snapRotation += rotation;
   return snapRotation;
}