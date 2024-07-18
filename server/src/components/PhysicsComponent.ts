import { Settings } from "webgl-test-shared/dist/settings";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { TileType, TILE_MOVE_SPEED_MULTIPLIERS, TILE_FRICTIONS } from "webgl-test-shared/dist/tiles";
import { ComponentArray } from "./ComponentArray";
import { addDirtyPathfindingEntity, entityCanBlockPathfinding, removeDirtyPathfindingEntity } from "../pathfinding";
import { Point } from "webgl-test-shared/dist/utils";
import Board from "../Board";
import { registerPlayerKnockback } from "../server/player-clients";
import { TransformComponent, TransformComponentArray } from "./TransformComponent";
import { Packet } from "webgl-test-shared/dist/packets";

export interface PhysicsComponentParams {
   velocityX: number;
   velocityY: number;
   accelerationX: number;
   accelerationY: number;
   isAffectedByFriction: boolean;
   isImmovable: boolean;
}

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

   // @Cleanup: maybe change into isAirborne?
   /** If set to false, the game object will not experience friction from moving over tiles. */
   public isAffectedByFriction: boolean;

   /** If true, the entity will not be pushed around by collisions, but will still call any relevant events. */
   public readonly isImmovable: boolean;

   /** Whether the game object's position has changed during the current tick or not. Used during collision detection to avoid unnecessary collision checks */
   public positionIsDirty = false;

   /** Whether the game object's hitboxes' bounds have changed during the current tick or not. If true, marks the game object to have its hitboxes and containing chunks updated */
   public hitboxesAreDirty = false;

   public pathfindingNodesAreDirty = false;
   
   constructor(params: PhysicsComponentParams) {
      this.velocity = new Point(params.velocityX, params.velocityY);
      this.acceleration = new Point(params.accelerationX, params.accelerationY);
      
      this.isAffectedByFriction = params.isAffectedByFriction;
      this.isImmovable = params.isImmovable;
   }
}

export const PhysicsComponentArray = new ComponentArray<PhysicsComponent>(ServerComponentType.physics, true, {
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onRemove(entity: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (physicsComponent.pathfindingNodesAreDirty) {
      removeDirtyPathfindingEntity(entity);
   }
}

const cleanRotation = (transformComponent: TransformComponent): void => {
   // Clamp rotation to [-PI, PI) range
   if (transformComponent.rotation < -Math.PI) {
      transformComponent.rotation += Math.PI * 2;
   } else if (transformComponent.rotation >= Math.PI) {
      transformComponent.rotation -= Math.PI * 2;
   }
}

const turnEntity = (transformComponent: TransformComponent, physicsComponent: PhysicsComponent): void => {
   const previousRotation = transformComponent.rotation;

   transformComponent.rotation += physicsComponent.angularVelocity * Settings.I_TPS;
   cleanRotation(transformComponent);
   
   if (physicsComponent.turnSpeed !== 0) {
      let clockwiseDist = physicsComponent.targetRotation - transformComponent.rotation;
      if (clockwiseDist < 0) {
         clockwiseDist += 2 * Math.PI;
      } else if (clockwiseDist >= 2 * Math.PI) {
         clockwiseDist -= 2 * Math.PI;
      }

      // @Temporary?
      if (clockwiseDist < 0 || clockwiseDist > 2 * Math.PI) {
         console.warn("BAD ROTATION!!!", physicsComponent.targetRotation, transformComponent.rotation, physicsComponent.targetRotation - transformComponent.rotation, clockwiseDist, 2 * Math.PI);
      }
      
      if (clockwiseDist <= Math.PI) {  
         transformComponent.rotation += physicsComponent.turnSpeed * Settings.I_TPS;
         // If the entity would turn past the target direction, snap back to the target direction
         if (physicsComponent.turnSpeed * Settings.I_TPS > clockwiseDist) {
            transformComponent.rotation = physicsComponent.targetRotation;
         }
      } else {
         const anticlockwiseDist = 2 * Math.PI - clockwiseDist;
         
         transformComponent.rotation -= physicsComponent.turnSpeed * Settings.I_TPS
         // If the entity would turn past the target direction, snap back to the target direction
         if (physicsComponent.turnSpeed * Settings.I_TPS > anticlockwiseDist) {
            transformComponent.rotation = physicsComponent.targetRotation;
         }
      }
   }

   if (transformComponent.rotation !== previousRotation) {
      cleanRotation(transformComponent);

      physicsComponent.hitboxesAreDirty = true;
   }
}

const applyPhysics = (entity: EntityID, physicsComponent: PhysicsComponent): void => {
   // @Speed: There are a whole bunch of conditions in here which rely on physicsComponent.isAffectedByFriction,
   // which is only set at the creation of an entity. To remove these conditions we could probably split the physics
   // entities into two groups, and call two different applyPhysicsFriction and applyPhysicsNoFriction functions to
   // the corresponding groups
   
   // @Temporary @Hack
   if (isNaN(physicsComponent.velocity.x) || isNaN(physicsComponent.velocity.x)) {
      console.warn("Entity type " + EntityTypeString[Board.getEntityType(entity)!] + " velocity was NaN.");
      physicsComponent.velocity.x = 0;
      physicsComponent.velocity.y = 0;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);

   // Apply acceleration
   if (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) {
      // @Speed: very complicated logic
      let moveSpeedMultiplier: number;
      if (physicsComponent.overrideMoveSpeedMultiplier || !physicsComponent.isAffectedByFriction) {
         moveSpeedMultiplier = 1;
      } else if (transformComponent.tile.type === TileType.water && !transformComponent.isInRiver) {
         moveSpeedMultiplier = physicsComponent.moveSpeedMultiplier;
      } else {
         moveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[transformComponent.tile.type] * physicsComponent.moveSpeedMultiplier;
      }

      const tileFriction = TILE_FRICTIONS[transformComponent.tile.type];
      
      // @Speed: A lot of multiplies
      physicsComponent.velocity.x += physicsComponent.acceleration.x * tileFriction * moveSpeedMultiplier * Settings.I_TPS;
      physicsComponent.velocity.y += physicsComponent.acceleration.y * tileFriction * moveSpeedMultiplier * Settings.I_TPS;
   }

   // If the game object is in a river, push them in the flow direction of the river
   // The tileMoveSpeedMultiplier check is so that game objects on stepping stones aren't pushed
   if (transformComponent.isInRiver && !physicsComponent.overrideMoveSpeedMultiplier && physicsComponent.isAffectedByFriction) {
      const flowDirection = transformComponent.tile.riverFlowDirection;
      physicsComponent.velocity.x += 240 * Settings.I_TPS * a[flowDirection];
      physicsComponent.velocity.y += 240 * Settings.I_TPS * b[flowDirection];
   }

   // Apply velocity
   if (physicsComponent.velocity.x !== 0 || physicsComponent.velocity.y !== 0) {
      // Friction
      if (physicsComponent.isAffectedByFriction) {
         // @Speed: pre-multiply the array
         const tileFriction = TILE_FRICTIONS[transformComponent.tile.type];

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
      
      // @Incomplete(???): Multiply by move speed multiplier?
      transformComponent.position.x += physicsComponent.velocity.x * Settings.I_TPS;
      transformComponent.position.y += physicsComponent.velocity.y * Settings.I_TPS;

      physicsComponent.positionIsDirty = true;
   }
}

const dirtifyPathfindingNodes = (entity: EntityID, physicsComponent: PhysicsComponent): void => {
   if (!physicsComponent.pathfindingNodesAreDirty && entityCanBlockPathfinding(entity)) {
      addDirtyPathfindingEntity(entity);
      physicsComponent.pathfindingNodesAreDirty = true;
   }
}

const updatePosition = (entity: EntityID, physicsComponent: PhysicsComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   if (physicsComponent.hitboxesAreDirty) {
      // @Incomplete: if hitboxes are dirty, should still resolve wall tile collisions, etc.
      transformComponent.cleanHitboxes(entity);
      transformComponent.updateContainingChunks(entity);
      physicsComponent.hitboxesAreDirty = false;
      
      dirtifyPathfindingNodes(entity, physicsComponent);
   } else if (physicsComponent.positionIsDirty) {
      transformComponent.cleanHitboxes(entity);
      transformComponent.updateContainingChunks(entity);

      dirtifyPathfindingNodes(entity, physicsComponent);
   }

   if (physicsComponent.positionIsDirty) {
      physicsComponent.positionIsDirty = false;

      transformComponent.resolveWallTileCollisions(entity);

      // If the object moved due to resolving wall tile collisions, recalculate
      if (physicsComponent.positionIsDirty) {
         transformComponent.cleanHitboxes(entity);
      }

      transformComponent.resolveBorderCollisions(entity);
   
      // If the object moved due to resolving border collisions, recalculate
      if (physicsComponent.positionIsDirty) {
         transformComponent.cleanHitboxes(entity);
      }

      transformComponent.updateTile();
      transformComponent.checkIsInRiver(entity);
   }
}

export function tickPhysicsComponents(): void {
   for (let i = 0; i < PhysicsComponentArray.components.length; i++) {
      const entity = PhysicsComponentArray.getEntityFromArrayIdx(i);
      const physicsComponent = PhysicsComponentArray.components[i];
      const transformComponent = TransformComponentArray.getComponent(entity);

      turnEntity(transformComponent, physicsComponent);
      applyPhysics(entity, physicsComponent);
      updatePosition(entity, physicsComponent);
   }
}

export function applyKnockback(entity: EntityID, knockback: number, knockbackDirection: number): void {
   if (!PhysicsComponentArray.hasComponent(entity)) {
      return;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (physicsComponent.isImmovable) {
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const knockbackForce = knockback / transformComponent.totalMass;
   physicsComponent.velocity.x += knockbackForce * Math.sin(knockbackDirection);
   physicsComponent.velocity.y += knockbackForce * Math.cos(knockbackDirection);

   if (Board.getEntityType(entity)! === EntityType.player) {
      registerPlayerKnockback(entity, knockback, knockbackDirection);
   }
}

function getDataLength(): number {
   return 5 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   packet.addNumber(physicsComponent.velocity.x);
   packet.addNumber(physicsComponent.velocity.y);
   packet.addNumber(physicsComponent.acceleration.x);
   packet.addNumber(physicsComponent.acceleration.y);
}