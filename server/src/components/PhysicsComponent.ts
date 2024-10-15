import { Settings } from "battletribes-shared/settings";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType, EntityTypeString } from "battletribes-shared/entities";
import { TileType, TILE_MOVE_SPEED_MULTIPLIERS, TILE_FRICTIONS } from "battletribes-shared/tiles";
import { ComponentArray } from "./ComponentArray";
import { addDirtyPathfindingEntity, entityCanBlockPathfinding, removeDirtyPathfindingEntity } from "../pathfinding";
import { Point } from "battletribes-shared/utils";
import { registerDirtyEntity, registerPlayerKnockback } from "../server/player-clients";
import { getEntityTile, TransformComponent, TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { changeEntityLayer, getEntityLayer, getEntityType, undergroundLayer } from "../world";

// @Cleanup: Variable names
const a = new Array<number>();
const b = new Array<number>();
for (let i = 0; i < 8; i++) {
   const angle = i / 4 * Math.PI;
   a.push(Math.sin(angle));
   b.push(Math.cos(angle));
}

/** Allows an entity to dynamically move its position around */
export class PhysicsComponent {
   // @Cleanup: unbox all of these into x and y and make the component implement its params
   public selfVelocity = new Point(0, 0);
   public acceleration = new Point(0, 0);
   public externalVelocity = new Point(0, 0);

   public turnSpeed = 0;
   /** Rotation the entity will try to turn towards. SHOULD ALWAYS BE IN RANGE [-PI, PI) */
   public targetRotation = 0;
   /** Can be negative. Unaffected by target rotation */
   public angularVelocity = 0;
   
   public moveSpeedMultiplier = 1;

   /** The higher this number is the faster the entity reaches its maximum speed. 1 = normal */
   public traction = 1;

   // @Cleanup: Might be able to be put on the physics component
   public overrideMoveSpeedMultiplier = false;

   public isAffectedByAirFriction = true;
   public isAffectedByGroundFriction = true;

   /** If true, the entity will not be pushed around by collisions, but will still call any relevant events. */
   public isImmovable = false;

   /** Whether the game object's position has changed during the current tick or not. Used during collision detection to avoid unnecessary collision checks */
   public positionIsDirty = false;

   /** Whether the game object's hitboxes' bounds have changed during the current tick or not. If true, marks the game object to have its hitboxes and containing chunks updated */
   public hitboxesAreDirty = false;

   public pathfindingNodesAreDirty = false;
}

export const PhysicsComponentArray = new ComponentArray<PhysicsComponent>(ServerComponentType.physics, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
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

const turnEntity = (entity: EntityID, transformComponent: TransformComponent, physicsComponent: PhysicsComponent): void => {
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
      registerDirtyEntity(entity);
   }
}

const applyPhysics = (entity: EntityID, transformComponent: TransformComponent, physicsComponent: PhysicsComponent): void => {
   // @Speed: There are a whole bunch of conditions in here which rely on physicsComponent.isAffectedByFriction,
   // which is only set at the creation of an entity. To remove these conditions we could probably split the physics
   // entities into two groups, and call two different applyPhysicsFriction and applyPhysicsNoFriction functions to
   // the corresponding groups
   
   // @Temporary @Hack
   if (isNaN(physicsComponent.selfVelocity.x) || isNaN(physicsComponent.selfVelocity.y)) {
      console.warn("Entity type " + EntityTypeString[getEntityType(entity)!] + " velocity was NaN.");
      physicsComponent.selfVelocity.x = 0;
      physicsComponent.selfVelocity.y = 0;
   }

   const layer = getEntityLayer(entity);
   
   const tileIndex = getEntityTile(transformComponent);
   const tileType = layer.tileTypes[tileIndex];

   // Apply acceleration
   if (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) {
      // @Speed: very complicated logic
      let moveSpeedMultiplier: number;
      if (physicsComponent.overrideMoveSpeedMultiplier || !physicsComponent.isAffectedByGroundFriction) {
         moveSpeedMultiplier = 1;
      } else if (tileType === TileType.water && !transformComponent.isInRiver) {
         moveSpeedMultiplier = physicsComponent.moveSpeedMultiplier;
      } else {
         moveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[tileType] * physicsComponent.moveSpeedMultiplier;
      }

      const tileFriction = TILE_FRICTIONS[tileType];
      
      // Calculate the desired velocity based on acceleration
      const desiredVelocityX = physicsComponent.acceleration.x * tileFriction * moveSpeedMultiplier;
      const desiredVelocityY = physicsComponent.acceleration.y * tileFriction * moveSpeedMultiplier;

      // Apply velocity with traction (blend towards desired velocity)
      physicsComponent.selfVelocity.x += (desiredVelocityX - physicsComponent.selfVelocity.x) * physicsComponent.traction * Settings.I_TPS;
      physicsComponent.selfVelocity.y += (desiredVelocityY - physicsComponent.selfVelocity.y) * physicsComponent.traction * Settings.I_TPS;
   }

   // If the game object is in a river, push them in the flow direction of the river
   // The tileMoveSpeedMultiplier check is so that game objects on stepping stones aren't pushed
   if (transformComponent.isInRiver && !physicsComponent.overrideMoveSpeedMultiplier && physicsComponent.isAffectedByGroundFriction) {
      const flowDirectionIdx = layer.riverFlowDirections[tileIndex];
      physicsComponent.externalVelocity.x += 240 * Settings.I_TPS * a[flowDirectionIdx];
      physicsComponent.externalVelocity.y += 240 * Settings.I_TPS * b[flowDirectionIdx];
   }

   let shouldUpdate = false;
   
   // Apply friction to self-velocity
   if (physicsComponent.selfVelocity.x !== 0 || physicsComponent.selfVelocity.y !== 0) {
      const friction = TILE_FRICTIONS[tileType];
      
      if (physicsComponent.isAffectedByAirFriction) {
         // Air friction
         physicsComponent.selfVelocity.x *= 1 - friction * Settings.I_TPS * 2;
         physicsComponent.selfVelocity.y *= 1 - friction * Settings.I_TPS * 2;
      }

      if (physicsComponent.isAffectedByGroundFriction) {
         // @Incomplete @Bug: Doesn't take into account the TPS. Would also be fixed by pre-multiplying the array
         // Ground friction
         const selfVelocityMagnitude = physicsComponent.selfVelocity.length();
         if (selfVelocityMagnitude > 0) {
            const groundFriction = Math.min(friction, selfVelocityMagnitude);
            physicsComponent.selfVelocity.x -= groundFriction * physicsComponent.selfVelocity.x / selfVelocityMagnitude;
            physicsComponent.selfVelocity.y -= groundFriction * physicsComponent.selfVelocity.y / selfVelocityMagnitude;
         }
      }

      shouldUpdate = true;
   }

   // Apply friction to external velocity
   if (physicsComponent.externalVelocity.x !== 0 || physicsComponent.externalVelocity.y !== 0) {
      const friction = TILE_FRICTIONS[tileType];
      
      if (physicsComponent.isAffectedByAirFriction) {
         // Air friction
         physicsComponent.externalVelocity.x *= 1 - friction * Settings.I_TPS * 2;
         physicsComponent.externalVelocity.y *= 1 - friction * Settings.I_TPS * 2;
      }

      if (physicsComponent.isAffectedByGroundFriction) {
         // @Incomplete @Bug: Doesn't take into acount the TPS. Would also be fixed by pre-multiplying the array
         // Ground friction
         const externalVelocityMagnitude = physicsComponent.externalVelocity.length();
         if (externalVelocityMagnitude > 0) {
            const groundFriction = Math.min(friction, externalVelocityMagnitude);
            physicsComponent.externalVelocity.x -= groundFriction * physicsComponent.externalVelocity.x / externalVelocityMagnitude;
            physicsComponent.externalVelocity.y -= groundFriction * physicsComponent.externalVelocity.y / externalVelocityMagnitude;
         }
      }

      shouldUpdate = true;
   }

   if (shouldUpdate) {
      // Update position based on the sum of self-velocity and external velocity
      transformComponent.position.x += (physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x) * Settings.I_TPS;
      transformComponent.position.y += (physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y) * Settings.I_TPS;

      physicsComponent.positionIsDirty = true;
      registerDirtyEntity(entity);
   }
}

const dirtifyPathfindingNodes = (entity: EntityID, physicsComponent: PhysicsComponent): void => {
   if (!physicsComponent.pathfindingNodesAreDirty && entityCanBlockPathfinding(entity)) {
      addDirtyPathfindingEntity(entity);
      physicsComponent.pathfindingNodesAreDirty = true;
   }
}
   
const resolveBorderCollisions = (transformComponent: TransformComponent, physicsComponent: PhysicsComponent): void => {
   // Left border
   if (transformComponent.boundingAreaMinX < 0) {
      transformComponent.position.x -= transformComponent.boundingAreaMinX;
      physicsComponent.selfVelocity.x = 0;
      physicsComponent.externalVelocity.x = 0;
      physicsComponent.positionIsDirty = true;
      // Right border
   } else if (transformComponent.boundingAreaMaxX > Settings.BOARD_UNITS) {
      transformComponent.position.x -= transformComponent.boundingAreaMaxX - Settings.BOARD_UNITS;
      physicsComponent.selfVelocity.x = 0;
      physicsComponent.externalVelocity.x = 0;
      physicsComponent.positionIsDirty = true;
   }

   // Bottom border
   if (transformComponent.boundingAreaMinY < 0) {
      transformComponent.position.y -= transformComponent.boundingAreaMinY;
      physicsComponent.selfVelocity.y = 0;
      physicsComponent.externalVelocity.y = 0;
      physicsComponent.positionIsDirty = true;
      // Top border
   } else if (transformComponent.boundingAreaMaxY > Settings.BOARD_UNITS) {
      transformComponent.position.y -= transformComponent.boundingAreaMaxY - Settings.BOARD_UNITS;
      physicsComponent.selfVelocity.y = 0;
      physicsComponent.externalVelocity.y = 0;
      physicsComponent.positionIsDirty = true;
   }
}

const updatePosition = (entity: EntityID, transformComponent: TransformComponent, physicsComponent: PhysicsComponent): void => {
   // @Cleanup: aren't both these the same?
   if (physicsComponent.hitboxesAreDirty) {
      // @Incomplete: if hitboxes are dirty, should still resolve wall tile collisions, etc.
      transformComponent.cleanHitboxes(entity);
      transformComponent.updateContainingChunks(entity);
      physicsComponent.hitboxesAreDirty = false;
      
      dirtifyPathfindingNodes(entity, physicsComponent);
      registerDirtyEntity(entity);
   } else if (physicsComponent.positionIsDirty) {
      transformComponent.cleanHitboxes(entity);
      transformComponent.updateContainingChunks(entity);

      dirtifyPathfindingNodes(entity, physicsComponent);
      registerDirtyEntity(entity);
   }

   if (physicsComponent.positionIsDirty) {
      physicsComponent.positionIsDirty = false;

      transformComponent.resolveWallCollisions(entity);

      // If the object moved due to resolving wall tile collisions, recalculate
      if (physicsComponent.positionIsDirty) {
         transformComponent.cleanHitboxes(entity);
         registerDirtyEntity(entity);
      }

      resolveBorderCollisions(transformComponent, physicsComponent);

      // If the entity is outside the world border after resolving border collisions, throw an error
      if (transformComponent.position.x < 0 || transformComponent.position.x >= Settings.BOARD_UNITS || transformComponent.position.y < 0 || transformComponent.position.y >= Settings.BOARD_UNITS) {
         throw new Error("Unable to properly resolve border collisions for " + EntityTypeString[getEntityType(entity)!] + ".");
      }
   
      // If the object moved due to resolving border collisions, recalculate
      if (physicsComponent.positionIsDirty) {
         transformComponent.cleanHitboxes(entity);
         registerDirtyEntity(entity);
      }

      transformComponent.updateIsInRiver(entity);

      // Check to see if the entity has descended into the underground layer
      const entityType = getEntityType(entity);
      if (entityType !== EntityType.guardian && entityType !== EntityType.guardianSpikyBall) {
         const layer = getEntityLayer(entity);
         const tileIndex = getEntityTile(transformComponent);
         if (layer.tileTypes[tileIndex] === TileType.dropdown) {
            changeEntityLayer(entity, undergroundLayer);
         }
      }
   }
}

function onTick(physicsComponent: PhysicsComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   turnEntity(entity, transformComponent, physicsComponent);
   applyPhysics(entity, transformComponent, physicsComponent);
   updatePosition(entity, transformComponent, physicsComponent);
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
   physicsComponent.externalVelocity.x += knockbackForce * Math.sin(knockbackDirection);
   physicsComponent.externalVelocity.y += knockbackForce * Math.cos(knockbackDirection);

   // @Hack?
   if (getEntityType(entity)! === EntityType.player) {
      registerPlayerKnockback(entity, knockback, knockbackDirection);
   }
}

export function applyAbsoluteKnockback(entity: EntityID, knockback: number, knockbackDirection: number): void {
   if (!PhysicsComponentArray.hasComponent(entity)) {
      return;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (physicsComponent.isImmovable) {
      return;
   }
   
   physicsComponent.externalVelocity.x += knockback * Math.sin(knockbackDirection);
   physicsComponent.externalVelocity.y += knockback * Math.cos(knockbackDirection);

   // @Hack?
   if (getEntityType(entity)! === EntityType.player) {
      registerPlayerKnockback(entity, knockback, knockbackDirection);
   }
}

function getDataLength(): number {
   return 8 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   packet.addNumber(physicsComponent.selfVelocity.x);
   packet.addNumber(physicsComponent.selfVelocity.y);
   packet.addNumber(physicsComponent.externalVelocity.x);
   packet.addNumber(physicsComponent.externalVelocity.y);
   packet.addNumber(physicsComponent.acceleration.x);
   packet.addNumber(physicsComponent.acceleration.y);
   packet.addNumber(physicsComponent.traction);
}