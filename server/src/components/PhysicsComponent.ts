import { Settings } from "webgl-test-shared/dist/settings";
import { PhysicsComponentData } from "webgl-test-shared/dist/components";
import { EntityTypeString } from "webgl-test-shared/dist/entities";
import { TileType, TILE_MOVE_SPEED_MULTIPLIERS, TILE_FRICTIONS } from "webgl-test-shared/dist/tiles";
import Entity from "../Entity";
import { ComponentArray } from "./ComponentArray";
import { addDirtyPathfindingEntity, entityCanBlockPathfinding } from "../pathfinding";
import { Point } from "webgl-test-shared/dist/utils";

// @Cleanup: Variable names
const a = new Array<number>();
const b = new Array<number>();
for (let i = 0; i < 8; i++) {
   const angle = i / 4 * Math.PI;
   a.push(Math.sin(angle));
   b.push(Math.cos(angle));
}

/** Anything to do with entities moving */
export class PhysicsComponent {
   public velocity: Point;
   public acceleration: Point;

   public turnSpeed = 0;
   /** Rotation the entity will try to turn towards. SHOULD ALWAYS BE IN RANGE [-PI, PI) */
   public targetRotation = 0;
   /** Can be negative. Unaffected by target rotation */
   public angularVelocity = 0;
   
   public moveSpeedMultiplier = 1 + Number.EPSILON;

   // @Cleanup: Might be able to be put on the physics component
   public overrideMoveSpeedMultiplier = false;

   /** If set to false, the game object will not experience friction from moving over tiles. */
   public isAffectedByFriction: boolean;

   /** If true, the entity will not be pushed around by collisions, but will still call any relevant events. */
   public readonly isImmovable: boolean;

   /** Whether the game object's position has changed during the current tick or not. Used during collision detection to avoid unnecessary collision checks */
   public positionIsDirty = false;

   /** Whether the game object's hitboxes' bounds have changed during the current tick or not. If true, marks the game object to have its hitboxes and containing chunks updated */
   public hitboxesAreDirty = false;

   public pathfindingNodesAreDirty = false;
   
   constructor(velocityX: number, velocityY: number, accelerationX: number, accelerationY: number, isAffectedByFriction: boolean, isImmovable: boolean) {
      this.velocity = new Point(velocityX, velocityY);
      this.acceleration = new Point(accelerationX, accelerationY);
      
      this.isAffectedByFriction = isAffectedByFriction;
      this.isImmovable = isImmovable;
   }
}

export const PhysicsComponentArray = new ComponentArray<PhysicsComponent>(true);

const cleanRotation = (entity: Entity): void => {
   // Clamp rotation to [-PI, PI) range
   if (entity.rotation < -Math.PI) {
      entity.rotation += Math.PI * 2;
   } else if (entity.rotation >= Math.PI) {
      entity.rotation -= Math.PI * 2;
   }
   
   // const rotation = cleanAngle(entity.rotation);
   // if (rotation !== entity.rotation) {
   //    entity.rotation = rotation;
      
   //    const physicsComponent = PhysicsComponentArray.getComponent(entity.id);
   //    physicsComponent.hitboxesAreDirty = true;
   // }
}

const shouldTurnClockwise = (entity: Entity, physicsComponent: PhysicsComponent): boolean => {
   const before = entity.rotation;
   const before2 = physicsComponent.targetRotation;
   // @Cleanup: Introduces side effects
   // @Temporary @Speed: instead of doing this, probably just clean rotation after all places which could dirty it
   cleanRotation(entity);

   // @Hack
   if (physicsComponent.targetRotation < 0) {
      physicsComponent.targetRotation += 2 * Math.PI;
   }
   
   const clockwiseDist = (physicsComponent.targetRotation - entity.rotation + Math.PI * 2) % (Math.PI * 2);
   const anticlockwiseDist = Math.PI * 2 - clockwiseDist;
   if (clockwiseDist < 0 || anticlockwiseDist < 0) {
      throw new Error("Either targetRotation or this.rotation wasn't in the 0-to-2-pi range. Target rotation: " + physicsComponent.targetRotation + ", rotation: " + entity.rotation);
   }

   entity.rotation = before;
   physicsComponent.targetRotation = before2;
   return clockwiseDist < anticlockwiseDist;
}

const turnEntity = (entity: Entity, physicsComponent: PhysicsComponent): void => {
   const previousRotation = entity.rotation;

   entity.rotation += physicsComponent.angularVelocity * Settings.I_TPS;
   cleanRotation(entity);
   
   let diff = physicsComponent.targetRotation - entity.rotation;
   if (diff < 0) {
      diff += Math.PI * 2;
   }
   
   if (diff <= Math.PI) {  
      entity.rotation += physicsComponent.turnSpeed * Settings.I_TPS;
      // If the entity would turn past the target direction, snap back to the target direction
      if (physicsComponent.turnSpeed * Settings.I_TPS > diff) {
         entity.rotation = physicsComponent.targetRotation;
      }
   } else {
      entity.rotation -= physicsComponent.turnSpeed * Settings.I_TPS
      // If the entity would turn past the target direction, snap back to the target direction
      if (physicsComponent.turnSpeed * Settings.I_TPS < diff) {
         entity.rotation = physicsComponent.targetRotation;
      }
   }

   if (entity.rotation !== previousRotation) {
      cleanRotation(entity);

      physicsComponent.hitboxesAreDirty = true;
   }
}

const applyPhysics = (entity: Entity, physicsComponent: PhysicsComponent): void => {
   // @Speed: There are a whole bunch of conditions in here which rely on physicsComponent.isAffectedByFriction,
   // which is only set at the creation of an entity. To remove these conditions we could probably split the physics
   // entities into two groups, and call two different applyPhysicsFriction and applyPhysicsNoFriction functions to
   // the corresponding groups
   
   // @Temporary @Hack
   if (isNaN(physicsComponent.velocity.x) || isNaN(physicsComponent.velocity.x)) {
      console.warn("Entity type " + EntityTypeString[entity.type] + " velocity was NaN.");
      physicsComponent.velocity.x = 0;
      physicsComponent.velocity.y = 0;
   }

   // Apply acceleration
   if (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) {
      // @Speed: very complicated logic
      let moveSpeedMultiplier: number;
      if (physicsComponent.overrideMoveSpeedMultiplier || !physicsComponent.isAffectedByFriction) {
         moveSpeedMultiplier = 1;
      } else if (entity.tile.type === TileType.water && !entity.isInRiver) {
         moveSpeedMultiplier = physicsComponent.moveSpeedMultiplier;
      } else {
         moveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[entity.tile.type] * physicsComponent.moveSpeedMultiplier;
      }

      const tileFriction = TILE_FRICTIONS[entity.tile.type];
      
      // @Speed: A lot of multiplies
      physicsComponent.velocity.x += physicsComponent.acceleration.x * tileFriction * moveSpeedMultiplier * Settings.I_TPS;
      physicsComponent.velocity.y += physicsComponent.acceleration.y * tileFriction * moveSpeedMultiplier * Settings.I_TPS;
   }

   // If the game object is in a river, push them in the flow direction of the river
   // The tileMoveSpeedMultiplier check is so that game objects on stepping stones aren't pushed
   if (entity.isInRiver && !physicsComponent.overrideMoveSpeedMultiplier && physicsComponent.isAffectedByFriction) {
      const flowDirection = entity.tile.riverFlowDirection;
      physicsComponent.velocity.x += 240 * Settings.I_TPS * a[flowDirection];
      physicsComponent.velocity.y += 240 * Settings.I_TPS * b[flowDirection];
   }

   // Apply velocity
   if (physicsComponent.velocity.x !== 0 || physicsComponent.velocity.y !== 0) {
      // Friction
      if (physicsComponent.isAffectedByFriction) {
         // @Speed: pre-multiply the array
         const tileFriction = TILE_FRICTIONS[entity.tile.type];

         // Apply a friction based on the tile type for air resistance (???)
         physicsComponent.velocity.x *= 1 - tileFriction * Settings.I_TPS * 2;
         physicsComponent.velocity.y *= 1 - tileFriction * Settings.I_TPS * 2;

         // Apply a constant friction based on the tile type to simulate ground friction
         // @Incomplete @Bug: Doesn't take into acount the TPS. Would also be fixed by pre-multiplying the array
         const velocityMagnitude = physicsComponent.velocity.length();
         if (tileFriction < velocityMagnitude) {
            physicsComponent.velocity.x -= tileFriction * physicsComponent.velocity.x / velocityMagnitude;
            physicsComponent.velocity.y -= tileFriction * physicsComponent.velocity.y / velocityMagnitude;
         } else {
            physicsComponent.velocity.x = 0;
            physicsComponent.velocity.y = 0;
         }
      }
      
      // @Incomplete(???): Multiply by move speed multiplier
      entity.position.x += physicsComponent.velocity.x * Settings.I_TPS;
      entity.position.y += physicsComponent.velocity.y * Settings.I_TPS;

      physicsComponent.positionIsDirty = true;
   }
}

const dirtifyPathfindingNodes = (entity: Entity, physicsComponent: PhysicsComponent): void => {
   if (!physicsComponent.pathfindingNodesAreDirty && entityCanBlockPathfinding(entity.type)) {
      addDirtyPathfindingEntity(entity);
      physicsComponent.pathfindingNodesAreDirty = true;
   }
}

const updatePosition = (entity: Entity, physicsComponent: PhysicsComponent): void => {
   if (physicsComponent.hitboxesAreDirty) {
      // @Incomplete: if hitboxes are dirty, should still resolve wall tile collisions, etc.
      entity.cleanHitboxes();
      entity.updateContainingChunks();
      physicsComponent.hitboxesAreDirty = false;
      
      dirtifyPathfindingNodes(entity, physicsComponent);
   } else if (physicsComponent.positionIsDirty) {
      entity.updateHitboxes();
      entity.updateContainingChunks();

      dirtifyPathfindingNodes(entity, physicsComponent);
   }

   if (physicsComponent.positionIsDirty) {
      physicsComponent.positionIsDirty = false;

      entity.resolveWallTileCollisions();

      // If the object moved due to resolving wall tile collisions, recalculate
      if (physicsComponent.positionIsDirty) {
         entity.updateHitboxes();
      }

      entity.resolveBorderCollisions();
   
      // If the object moved due to resolving border collisions, recalculate
      if (physicsComponent.positionIsDirty) {
         entity.updateHitboxes();
      }

      entity.updateTile();
      entity.checkIsInRiver();
   }
}

export function tickPhysicsComponents(): void {
   for (let i = 0; i < PhysicsComponentArray.components.length; i++) {
      const entity = PhysicsComponentArray.getEntity(i);
      const physicsComponent = PhysicsComponentArray.components[i];

      turnEntity(entity, physicsComponent);
      applyPhysics(entity, physicsComponent);
      updatePosition(entity, physicsComponent);
   }
}

export function applyKnockback(entity: Entity, knockback: number, knockbackDirection: number): void {
   if (!PhysicsComponentArray.hasComponent(entity.id)) {
      return;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(entity.id);
   if (physicsComponent.isImmovable) {
      return;
   }
   
   const knockbackForce = knockback / entity.totalMass;
   physicsComponent.velocity.x += knockbackForce * Math.sin(knockbackDirection);
   physicsComponent.velocity.y += knockbackForce * Math.cos(knockbackDirection);
}

export function serialisePhysicsComponent(entityID: number): PhysicsComponentData {
   const physicsComponent = PhysicsComponentArray.getComponent(entityID);

   return {
      velocity: physicsComponent.velocity.package(),
      acceleration: physicsComponent.acceleration.package()
   };
}