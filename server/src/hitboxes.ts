import { Box, HitboxCollisionType, HitboxFlagBit, HitboxTag, cloneBox } from "../../shared/dist/boxes.js";
import { CollisionBit } from "../../shared/dist/collision.js";
import { Entity, EntityType } from "../../shared/dist/entities.js";
import { Settings } from "../../shared/dist/settings.js";
import { TILE_PHYSICS_INFO_RECORD, TileType } from "../../shared/dist/tiles.js";
import { Point, getAngleDiff, TileIndex, getTileIndexIncludingEdges } from "../../shared/dist/utils.js";
import { CollisionVars, entitiesAreColliding } from "./collision-detection.js";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent.js";
import { registerPlayerKnockback } from "./server/player-clients.js";
import { getEntityLayer, getEntityType } from "./world.js";

export interface Hitbox {
   readonly box: Box;
   
   // @Memory: is this fundamentally necessary??
   readonly localID: number;

   /** The entity the hitbox belongs to. */
   // @Cleanup would be really nice to make the entity field readonly, but rn it has to be set when it's initialised so idk how that would work
   entity: Entity;
   // Should never be directly set, instead should be set using the propagateRootEntityChange function.
   rootEntity: Entity;
   
   // @Memory idea for these two: group all connected hitboxes into one "HitboxGroup" / "CompositeHitbox", which isn't formed for singular hitboxes on their own.
   // - this would get rid of rootHitbox as well.
   parent: Hitbox | null;
   readonly children: Array<Hitbox>;
   
   previousPosX: number;
   previousPosY: number;
   accelX: number;
   accelY: number;
   
   previousRelativeAngle: number;
   angularAcceleration: number;
   
   mass: number;
   // @MEMORY these two are only used for four things: snobes digging down, players not colliding with plants when wearing the bush suit, arrows not going through some parts of embrasures, and blueprint entities not pushing stuff.
   readonly collisionBit: CollisionBit;
   collisionMask: number;

   /** AAAAAAAA AAAAAAAA 00000000 000BCDEF:
    * A = Hitbox tag.
    * B = Is static.                         (If true, the entity will not be pushed around by collisions or be able to be moved.)
    * C = Is part of parent. Default = true. (If true, the hitbox will be considered like it and its parent are part of the same thing, regardless of if they belong to different entities.)
    * D = Non-grass-blocking.
    * E = Ignores wall collisions.
    * F = Collision type, soft or hard.      (HitboxCollisionType)
    */
   flags: number;
}

export function createHitbox(transformComponent: TransformComponent, parent: Hitbox | null, box: Box, mass: number, collisionType: HitboxCollisionType, collisionBit: CollisionBit, collisionMask: number): Hitbox {
   return {
      box,
      localID: transformComponent.nextHitboxLocalID++,
      // THESE BOTH START AT 0 BUT WILL BE FILLED BY THE TRANSFORM COMPONENT'S INITIALISATION
      entity: 0,
      rootEntity: 0,
      parent: parent,
      children: [],
      previousPosX: box.posX,
      previousPosY: box.posY,
      accelX: 0,
      accelY: 0,
      previousRelativeAngle: box.relativeAngle,
      angularAcceleration: 0,
      mass: mass,
      collisionBit: collisionBit,
      collisionMask: collisionMask,
      flags: collisionType | HitboxFlagBit.IS_PART_OF_PARENT_BIT
   };
}

export function setHitboxTag(hitbox: Hitbox, tag: HitboxTag): void {
   hitbox.flags = (hitbox.flags & 0xFFFF) | (tag << 16);
}
export function getHitboxTag(hitbox: Hitbox): HitboxTag {
   return hitbox.flags >> 16;
}

export function setHitboxCollisionType(hitbox: Hitbox, collisionType: HitboxCollisionType): void {
   hitbox.flags = (hitbox.flags & ~1) | collisionType;
}
export function getHitboxCollisionType(hitbox: Hitbox): HitboxCollisionType {
   return hitbox.flags & 1;
}

export function hitboxIsStatic(hitbox: Hitbox): boolean {
   return hitbox.flags & HitboxFlagBit.IS_STATIC_BIT ? true : false;
}
export function setHitboxIsStatic(hitbox: Hitbox): void {
   hitbox.flags |= HitboxFlagBit.IS_STATIC_BIT;
}

export function hitboxIsPartOfParent(hitbox: Hitbox): boolean {
   return hitbox.flags & HitboxFlagBit.IS_PART_OF_PARENT_BIT ? true : false;
}
export function setHitboxIsPartOfParent(hitbox: Hitbox, isPartOfParent: boolean): void {
   if (isPartOfParent) {
      hitbox.flags |= HitboxFlagBit.IS_PART_OF_PARENT_BIT;
   } else {
      hitbox.flags &= ~HitboxFlagBit.IS_PART_OF_PARENT_BIT;
   }
}

export function hitboxIgnoresWallCollisions(hitbox: Hitbox): boolean {
   return hitbox.flags & HitboxFlagBit.IGNORES_WALL_COLLISIONS_BIT ? true : false;
}
export function setHitboxIgnoresWallCollisions(hitbox: Hitbox): void {
   hitbox.flags |= HitboxFlagBit.IGNORES_WALL_COLLISIONS_BIT;
}

export function setHitboxIsNonGrassBlocking(hitbox: Hitbox): void {
   hitbox.flags |= HitboxFlagBit.NON_GRASS_BLOCKING_BIT;
}
export function hitboxIsNonGrassBlocking(hitbox: Hitbox): boolean {
   return hitbox.flags & HitboxFlagBit.NON_GRASS_BLOCKING_BIT ? true : false;
}

/** Returns a deep-clone of the hitbox. */
export function cloneHitbox(transformComponent: TransformComponent, hitbox: Hitbox): Hitbox {
   const clone = createHitbox(transformComponent, hitbox.parent, cloneBox(hitbox.box), hitbox.mass, 0, hitbox.collisionBit, hitbox.collisionMask);
   clone.flags = hitbox.flags;
   return clone;
}

export function getHitboxVelocity(hitbox: Hitbox): Point {
   const vx = (hitbox.box.posX - hitbox.previousPosX) * Settings.TICK_RATE;
   const vy = (hitbox.box.posY - hitbox.previousPosY) * Settings.TICK_RATE;
   return new Point(vx, vy);
}

export function setHitboxVelocityX(hitbox: Hitbox, vx: number): void {
   hitbox.previousPosX = hitbox.box.posX - vx * Settings.DT_S;
}

export function setHitboxVelocityY(hitbox: Hitbox, vy: number): void {
   hitbox.previousPosY = hitbox.box.posY - vy * Settings.DT_S;
}

export function setHitboxVelocity(hitbox: Hitbox, vx: number, vy: number): void {
   hitbox.previousPosX = hitbox.box.posX - vx * Settings.DT_S;
   hitbox.previousPosY = hitbox.box.posY - vy * Settings.DT_S;
}

export function getRootHitbox(hitbox: Hitbox): Hitbox {
   // @Bug: This can cause infinite loops. I should do a check here, or just rework the whole shitass system so this can never occur
   let currentHitbox = hitbox;
   while (currentHitbox.parent !== null) {
      currentHitbox = currentHitbox.parent;
   }
   return currentHitbox;
}

export function addHitboxVelocity(hitbox: Hitbox, addVec: Point): void {
   const rootHitbox = getRootHitbox(hitbox);
   if (!hitboxIsStatic(rootHitbox)) {
      rootHitbox.box.posX += addVec.x * Settings.DT_S;
      rootHitbox.box.posY += addVec.y * Settings.DT_S;
   }
}

export function translateHitbox(hitbox: Hitbox, translation: Point): void {
   const rootHitbox = getRootHitbox(hitbox);
   rootHitbox.box.posX += translation.x;
   rootHitbox.box.posY += translation.y;
   rootHitbox.previousPosX += translation.x;
   rootHitbox.previousPosY += translation.y;

   const transformComponent = TransformComponentArray.getComponent(hitbox.entity);
   transformComponent.isDirty = true;
}

export function teleportHitbox(hitbox: Hitbox, pos: Point): void {
   const rootHitbox = getRootHitbox(hitbox);
   rootHitbox.box.posX = pos.x;
   rootHitbox.box.posY = pos.y;
   rootHitbox.previousPosX = pos.x;
   rootHitbox.previousPosY = pos.y;

   const transformComponent = TransformComponentArray.getComponent(hitbox.entity);
   transformComponent.isDirty = true;
}

export function getHitboxTotalMassIncludingChildren(hitbox: Hitbox): number {
   let totalMass = hitbox.mass;
   for (const childHitbox of hitbox.children) {
      if (hitboxIsPartOfParent(childHitbox)) {
         totalMass += getHitboxTotalMassIncludingChildren(childHitbox);
      }
   }
   return totalMass;
}

export function getHitboxConnectedMass(hitbox: Hitbox): number {
   const rootHitbox = getRootHitbox(hitbox);
   return getHitboxTotalMassIncludingChildren(rootHitbox);
}

export function getHitboxMomentum(hitbox: Hitbox): Point {
   const momentum = getHitboxVelocity(hitbox);
   momentum.x *= hitbox.mass;
   momentum.y *= hitbox.mass;
   return momentum;
}

// @BUG: Should really apply force instead!!
export function applyKnockback(hitbox: Hitbox, addVec: Point): void {
   // @CLEANUP this is literally just addHitboxVelocity, but also registering it to the player.....
   
   const rootHitbox = getRootHitbox(hitbox);
   if (hitboxIsStatic(rootHitbox)) {
      return;
   }

   // @Speed: should take in knockback as knockbackX and knockbackY instead of in polar form...

   const totalMass = getHitboxConnectedMass(rootHitbox);
   if (totalMass === 0) {
      return;
   }
   const addX = addVec.x / totalMass;
   const addY = addVec.y / totalMass;
   const addVecProper = new Point(addX, addY);
   addHitboxVelocity(rootHitbox, addVecProper);

   // @Hack?
   if (getEntityType(rootHitbox.entity) === EntityType.player) {
      registerPlayerKnockback(rootHitbox.entity, addVecProper);
   }
}

// @Cleanup: Should be combined with previous function
export function applyAbsoluteKnockback(hitbox: Hitbox, knockback: Point): void {
   const rootHitbox = getRootHitbox(hitbox);
   if (hitboxIsStatic(rootHitbox)) {
      return;
   }

   addHitboxVelocity(rootHitbox, knockback);

   // @Hack?
   // @Copynpaste
   if (getEntityType(rootHitbox.entity) === EntityType.player) {
      registerPlayerKnockback(rootHitbox.entity, knockback);
   }
}

export function applyAcceleration(hitbox: Hitbox, accelX: number, accelY: number): void {
   const rootHitbox = getRootHitbox(hitbox);
   if (!hitboxIsStatic(rootHitbox)) {
      rootHitbox.accelX += accelX;
      rootHitbox.accelY += accelY;
   }
}

export function applyForce(hitbox: Hitbox, forceX: number, forceY: number): void {
   const rootHitbox = getRootHitbox(hitbox);
   if (!hitboxIsStatic(rootHitbox)) {
      const hitboxConnectedMass = getHitboxTotalMassIncludingChildren(rootHitbox);
      if (hitboxConnectedMass !== 0) {
         rootHitbox.accelX += forceX / hitboxConnectedMass;
         rootHitbox.accelY += forceY / hitboxConnectedMass;
      }
   }
}

// @Cleanup: Passing in hitbox really isn't the best, ideally hitbox should self-contain all the necessary info... but is that really good? + memory efficient?
export function applyAccelerationFromGround(hitbox: Hitbox, acceleration: Point): void {
   const entity = hitbox.entity;

   const tileIndex = getHitboxTile(hitbox);
   const tileType = getEntityLayer(entity).getTileType(tileIndex);
   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tileType];
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // @Speed: very complicated logic
   let moveSpeedMultiplier: number;
   if (transformComponent.overrideMoveSpeedMultiplier || !transformComponent.isAffectedByGroundFriction) {
      moveSpeedMultiplier = 1;
   } else if (tileType === TileType.water && !hitboxIsInRiver(hitbox)) {
      moveSpeedMultiplier = transformComponent.moveSpeedMultiplier;
   } else {
      moveSpeedMultiplier = tilePhysicsInfo.moveSpeedMultiplier * transformComponent.moveSpeedMultiplier;
   }

   // Calculate the desired velocity based on acceleration
   const tileFriction = tilePhysicsInfo.friction;
   const desiredVelocityX = acceleration.x * tileFriction * moveSpeedMultiplier;
   const desiredVelocityY = acceleration.y * tileFriction * moveSpeedMultiplier;

   const currentVelocity = getHitboxVelocity(hitbox);

   applyAcceleration(hitbox, (desiredVelocityX - currentVelocity.x) * transformComponent.traction, (desiredVelocityY - currentVelocity.y) * transformComponent.traction);
}

/** Makes the hitboxes' angle be that as specified, by only changing its relative angle */
export function setHitboxAngle(hitbox: Hitbox, angle: number): void {
   const add = angle - hitbox.box.angle;
   hitbox.box.relativeAngle += add;
   hitbox.previousRelativeAngle += add;

   const transformComponent = TransformComponentArray.getComponent(hitbox.entity);
   transformComponent.isDirty = true;
}

/** Makes the hitboxes' relative angle be that as specified, by only changing its relative angle */
export function setHitboxRelativeAngle(hitbox: Hitbox, relativeAngle: number): void {
   const add = relativeAngle - hitbox.box.relativeAngle;
   hitbox.box.relativeAngle += add;
   hitbox.previousRelativeAngle += add;

   const transformComponent = TransformComponentArray.getComponent(hitbox.entity);
   transformComponent.isDirty = true;
}

const cleanAngle = (hitbox: Hitbox): void => {
   // Clamp angle to [-PI, PI) range
   if (hitbox.box.angle < -Math.PI) {
      hitbox.box.angle += Math.PI * 2;
   } else if (hitbox.box.angle >= Math.PI) {
      hitbox.box.angle -= Math.PI * 2;
   }
}

const cleanRelativeAngle = (hitbox: Hitbox): void => {
   // Clamp angle to [-PI, PI) range
   if (hitbox.box.relativeAngle < -Math.PI) {
      hitbox.box.relativeAngle += Math.PI * 2;
   } else if (hitbox.box.relativeAngle >= Math.PI) {
      hitbox.box.relativeAngle -= Math.PI * 2;
   }
}

export function getHitboxAngularVelocity(hitbox: Hitbox): number {
   // Here we don't use getAngleDiff but just subtract them, so that e.g. adding 2pi to the relative angle will register as some angular velocity
   // @INCOMPLETE @INVESTIGATE but the above comment is wrong??? we do just use getAngleDiff??
   return getAngleDiff(hitbox.previousRelativeAngle, hitbox.box.relativeAngle) * Settings.TICK_RATE;
}

export function setHitboxAngularVelocity(hitbox: Hitbox, angularVelocity: number): void {
   hitbox.previousRelativeAngle = hitbox.box.relativeAngle - angularVelocity * Settings.DT_S;
}

export function addHitboxAngularVelocity(hitbox: Hitbox, angularVelocity: number): void {
   hitbox.box.relativeAngle += angularVelocity * Settings.DT_S;
}

export function addHitboxAngularAcceleration(hitbox: Hitbox, acceleration: number): void {
   hitbox.angularAcceleration += acceleration;
}

export function turnHitboxToAngle(hitbox: Hitbox, idealAngle: number, turnSpeed: number, damping: number, idealAngleIsRelative: boolean): void {
   cleanAngle(hitbox);
   cleanRelativeAngle(hitbox);

   let idealRelativeAngle: number;
   if (idealAngleIsRelative) {
      idealRelativeAngle = idealAngle;
   } else {
      const parentAngle = hitbox.box.angle - hitbox.box.relativeAngle;
      idealRelativeAngle = idealAngle - parentAngle;
   }
   
   const angleDiff = getAngleDiff(hitbox.box.relativeAngle, idealRelativeAngle);
   const springForce = angleDiff * turnSpeed; // 'turn speed' is really a spring constant now
   
   const angularVelocity = getHitboxAngularVelocity(hitbox);
   const dampingForce = -angularVelocity * damping;

   hitbox.angularAcceleration += springForce + dampingForce;
}

export function getHitboxTile(hitbox: Hitbox): TileIndex {
   const tileX = Math.floor(hitbox.box.posX / Settings.TILE_SIZE);
   const tileY = Math.floor(hitbox.box.posY / Settings.TILE_SIZE);
   return getTileIndexIncludingEdges(tileX, tileY);
}

export function hitboxIsInRiver(hitbox: Hitbox): boolean {
   const entity = hitbox.entity;
   
   const tileIndex = getHitboxTile(hitbox);
   const layer = getEntityLayer(entity);

   const tileType = layer.tileTypes[tileIndex];
   if (tileType !== TileType.water) {
      return false;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   if (!transformComponent.isAffectedByGroundFriction) {
      return false;
   }

   // If the entity is standing on a stepping stone they aren't in a river
   // @Speed: we only need to check the chunks the hitbox is in
   for (const chunk of transformComponent.chunks) {
      for (const currentEntity of chunk.entities) {
         if (getEntityType(currentEntity) === EntityType.riverSteppingStone) {
            if (entitiesAreColliding(entity, currentEntity) !== CollisionVars.NO_COLLISION) {
               return false;
            }
         }
      }
   }

   return true;
}