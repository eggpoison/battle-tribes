import { assert, Point, getAngleDiff, rotatePointAroundOrigin, _point, polarVec2, randAngle, randFloat } from "../../../shared/dist/utils.js";
import { calculateBoxBounds, _bounds, HitboxTag, updateBox, Box, boxIsCircular, getBoxArea } from "../../../shared/dist/boxes.js";
import { PathfindingNodeIndex } from "../../../shared/dist/client-server-types.js";
import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityTypeString, EntityType } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { getSubtileIndex } from "../../../shared/dist/subtiles.js";
import { TILE_PHYSICS_INFO_RECORD, TileType } from "../../../shared/dist/tiles.js";
import { getEntityCollisionGroup } from "../../../shared/dist/collision-groups.js";
import { Bytes } from "../../../shared/dist/constants.js";
import Layer from "../Layer.js";
import Chunk from "../Chunk.js";
import { ComponentArray } from "./ComponentArray.js";
import { AIHelperComponentArray, entityIsNoticedByAI } from "./AIHelperComponent.js";
import { addEntityToPathfinding, clearEntityPathfindingNodes, entityCanBlockPathfinding, removeEntityFromPathfinding, updateEntityPathfindingNodeOccupance } from "../pathfinding.js";
import { resolveWallCollision } from "../collision-resolution.js";
import { destroyEntity, entityExists, getEntityLayer, getEntityType, setEntityLayer, surfaceLayer, undergroundLayer } from "../world.js";
import { removeEntityLights, updateEntityLights } from "../lights.js";
import { registerDirtyEntity } from "../server/player-clients.js";
import { addHitboxDataToPacket, getHitboxDataLength } from "../server/packet-hitboxes.js";
import { addHitboxAngularAcceleration, applyAcceleration, applyForce, getHitboxAngularVelocity, getHitboxTag, getHitboxTile, getHitboxTotalMassIncludingChildren, getHitboxVelocity, getRootHitbox, Hitbox, hitboxIgnoresWallCollisions, hitboxIsInRiver, hitboxIsPartOfParent, setHitboxIsPartOfParent, setHitboxVelocity, setHitboxVelocityX, setHitboxVelocityY, translateHitbox } from "../hitboxes.js";
import { EntityConfig, getConfigTransformComponent } from "../components.js";
import { addEntityTethersToWorld, destroyTether as destroyTether, getHitboxAngularConstraints, getHitboxAngularTethers, getHitboxTethers } from "../tethers.js";
import { CarrySlot, RideableComponentArray } from "./RideableComponent.js";

// @Cleanup: move mass/hitbox related stuff out? (Are there any entities which could take advantage of that extraction?)

export class TransformComponent {
   // @Speed: may want to re-introduce the totalMass property
   
   /** All chunks the entity is contained in */
   public readonly chunks: Array<Chunk> = [];
   
   /** All hitboxes attached to the entity */
   public readonly hitboxes: Array<Hitbox> = [];
   /** Hitboxes not attached to any hitbox interal to the same entity. Root hitboxes can either be hitboxes with no parent, or hitboxes with a different entity's hitbox as a parent. */
   public readonly rootHitboxes: Array<Hitbox> = [];
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   /** Whether the entities' hitboxes' transforms have been changed at all during the current tick. */
   public isDirty = false;

   public pathfindingNodesAreDirty = false;
   
   public lastValidLayer = surfaceLayer;

   public readonly occupiedPathfindingNodes = new Set<PathfindingNodeIndex>();

   public nextHitboxLocalID = 1;

   // @CLEANUP all of the following shit was copied from the past 'PhysicsComponent' but really makes sense to either be on hitboxes themselves, or jsut removed comlpetely

   public moveSpeedMultiplier = 1;

   /** The higher this number is the faster the entity reaches its maximum speed. 1 = normal */
   public traction = 1;

   // @Cleanup awfully cumbersome to work with and look at
   public overrideMoveSpeedMultiplier = false;

   public isAffectedByAirFriction = true;
   public isAffectedByGroundFriction = true;
}

// @Cleanup: Variable names (also is shit generally, shouldn't keep)
const a = [0];
const b = [0];
for (let i = 0; i < 8; i++) {
   const angle = i / 4 * Math.PI;
   a.push(Math.sin(angle));
   b.push(Math.cos(angle));
}

/** Only to be called during entity creation. */
export function addHitboxToTransformComponent(transformComponent: TransformComponent, hitbox: Hitbox): void {
   assert(!entityExists(hitbox.entity));

   assert(!transformComponent.hitboxes.includes(hitbox));
   transformComponent.hitboxes.push(hitbox);

   if (hitbox.parent === null) {
      transformComponent.rootHitboxes.push(hitbox);
   } else {
      assert(!hitbox.parent.children.includes(hitbox));
      // Hitboxes should never be created already attached to another entity! Instead the place which creates the entity config should create an entity attach info on the config.
      assert(!entityExists(hitbox.parent.entity));
      hitbox.parent.children.push(hitbox);
   }
}

/** Only to be called after an entity is created. */
export function addHitboxToEntity(entity: Entity, hitbox: Hitbox): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   transformComponent.hitboxes.push(hitbox);
   if (hitbox.parent === null) {
      transformComponent.rootHitboxes.push(hitbox);
   } else {
      assert(!hitbox.parent.children.includes(hitbox));
      hitbox.parent.children.push(hitbox);
   }

   calculateBoxBounds(hitbox.box);
   const minX = _bounds.minX;
   const maxX = _bounds.maxX;
   const minY = _bounds.minY;
   const maxY = _bounds.maxY;

   // Update bounding area
   if (minX < transformComponent.boundingAreaMinX) {
      transformComponent.boundingAreaMinX = minX;
   }
   if (maxX > transformComponent.boundingAreaMaxX) {
      transformComponent.boundingAreaMaxX = maxX;
   }
   if (minY < transformComponent.boundingAreaMinY) {
      transformComponent.boundingAreaMinY = minY;
   }
   if (maxY > transformComponent.boundingAreaMaxY) {
      transformComponent.boundingAreaMaxY = maxY;
   }

   // If the hitbox is clipping into a border, clean the entities' position so that it doesn't clip
   if (minX < 0 || maxX >= Settings.WORLD_UNITS || minY < 0 || maxY >= Settings.WORLD_UNITS) {
      cleanEntityTransform(entity);
   }
}

/** Returns the first hitbox with the specified flag. */
export function getHitboxByTag(transformComponent: TransformComponent, tag: HitboxTag): Hitbox | null {
   for (const hitbox of transformComponent.hitboxes) {
      if (getHitboxTag(hitbox) === tag) {
         return hitbox;
      }
   }

   return null;
}

export function getHitboxesByTag(transformComponent: TransformComponent, tag: HitboxTag): Array<Hitbox> {
   const matchingHitboxes: Array<Hitbox> = [];
   for (const hitbox of transformComponent.hitboxes) {
      if (getHitboxTag(hitbox) === tag) {
         matchingHitboxes.push(hitbox);
      }
   }
   return matchingHitboxes;
}

const addToChunk = (entity: Entity, layer: Layer, chunk: Chunk): void => {
   chunk.entities.push(entity);

   const chunkIndex = layer.getChunkIndex(chunk);
   const collisionGroup = getEntityCollisionGroup(getEntityType(entity));
   const collisionChunk = layer.getCollisionChunkByIndex(collisionGroup, chunkIndex);
   collisionChunk.push(entity);

   const numViewingMobs = chunk.viewingEntities.length;
   for (let i = 0; i < numViewingMobs; i++) {
      const viewingEntity = chunk.viewingEntities[i];
      const aiHelperComponent = AIHelperComponentArray.getComponent(viewingEntity);

      if (entityIsNoticedByAI(aiHelperComponent, entity)) {
         const idx = aiHelperComponent.potentialVisibleEntities.indexOf(entity);
         if (idx === -1 && viewingEntity !== entity) {
            aiHelperComponent.potentialVisibleEntities.push(entity);
            aiHelperComponent.potentialVisibleEntityAppearances.push(1);
         } else {
            aiHelperComponent.potentialVisibleEntityAppearances[idx]++;
         }
      }
   }
}

const removeFromChunk = (entity: Entity, layer: Layer, chunk: Chunk): void => {
   let idx = chunk.entities.indexOf(entity);
   if (idx !== -1) {
      chunk.entities.splice(idx, 1);
   }

   const chunkIndex = layer.getChunkIndex(chunk);
   const collisionGroup = getEntityCollisionGroup(getEntityType(entity));
   const collisionChunk = layer.getCollisionChunkByIndex(collisionGroup, chunkIndex);
   idx = collisionChunk.indexOf(entity);
   if (idx !== -1) {
      collisionChunk.splice(idx, 1);
   }

   // @Incomplete
   // Remove the entity from the potential visible entities of all entities viewing the chunk
   const numViewingMobs = chunk.viewingEntities.length;
   for (let i = 0; i < numViewingMobs; i++) {
      const viewingEntity = chunk.viewingEntities[i];
      if (viewingEntity === entity) {
         continue;
      }

      const aiHelperComponent = AIHelperComponentArray.getComponent(viewingEntity);

      const idx = aiHelperComponent.potentialVisibleEntities.indexOf(entity);
      // We do this check as decorative entities are sometimes not in the potential visible entities array
      if (idx !== -1) {
         aiHelperComponent.potentialVisibleEntityAppearances[idx]--;
         if (aiHelperComponent.potentialVisibleEntityAppearances[idx] === 0) {
            aiHelperComponent.potentialVisibleEntities.splice(idx, 1);
            aiHelperComponent.potentialVisibleEntityAppearances.splice(idx, 1);
   
            const idx2 = aiHelperComponent.visibleEntities.indexOf(entity);
            if (idx2 !== -1) {
               aiHelperComponent.visibleEntities.splice(idx2, 1);
            }
         }
      }
   }
}

const updateContainingChunks = (transformComponent: TransformComponent, entity: Entity): void => {
   const layer = getEntityLayer(entity);
   
   // Calculate containing chunks
   const containingChunks: Array<Chunk> = [];
   for (const hitbox of transformComponent.hitboxes) {
      calculateBoxBounds(hitbox.box);
      const minChunkX = Math.max(Math.min(Math.floor(_bounds.minX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(_bounds.maxX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(_bounds.minY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(_bounds.maxY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);

      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            if (containingChunks.indexOf(chunk) === -1) {
               containingChunks.push(chunk);
            }
         }
      }
   }

   // Add all new chunks
   for (let i = 0; i < containingChunks.length; i++) {
      const chunk = containingChunks[i];
      if (transformComponent.chunks.indexOf(chunk) === -1) {
         addToChunk(entity, layer, chunk);
         transformComponent.chunks.push(chunk);
      }
   }

   // Find all chunks which aren't present in the new chunks and remove them
   for (let i = 0; i < transformComponent.chunks.length; i++) {
      const chunk = transformComponent.chunks[i]
      if (containingChunks.indexOf(chunk) === -1) {
         removeFromChunk(entity, layer, chunk);
         transformComponent.chunks.splice(i, 1);
         i--;
      }
   }
}
   
/** Recalculates the dirty miscellaneous transform-related info to match the hitbox's position and angle */
const cleanHitboxTransformIncludingChildren = (hitbox: Hitbox): void => {
   if (hitbox.parent === null) {
      hitbox.box.angle = hitbox.box.relativeAngle;
   } else {
      updateBox(hitbox.box, hitbox.parent.box);
      // @Cleanup: maybe should be done in the updatebox function?? if it become updateHitbox??
      const parentVelocity = getHitboxVelocity(hitbox.parent);
      setHitboxVelocity(hitbox, parentVelocity.x, parentVelocity.y);
   }

   for (const childHitbox of hitbox.children) {
      cleanHitboxTransformIncludingChildren(childHitbox);
   }
}

const updateBoundsAndChunks = (entity: Entity, transformComponent: TransformComponent): void => {
   const hitboxes = transformComponent.hitboxes;
   
   let boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   let boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   let boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   let boundingAreaMaxY = Number.MIN_SAFE_INTEGER;
   for (let i = 0, len = hitboxes.length; i < len; i++) {
      const hitbox = hitboxes[i];
      
      calculateBoxBounds(hitbox.box);
      const minX = _bounds.minX;
      const maxX = _bounds.maxX;
      const minY = _bounds.minY;
      const maxY = _bounds.maxY;

      // Update bounding area
      if (minX < boundingAreaMinX) {
         boundingAreaMinX = minX;
      }
      if (maxX > boundingAreaMaxX) {
         boundingAreaMaxX = maxX;
      }
      if (minY < boundingAreaMinY) {
         boundingAreaMinY = minY;
      }
      if (maxY > boundingAreaMaxY) {
         boundingAreaMaxY = maxY;
      }
   }

   // Check if the hitboxes' chunk bounds have changed
   if (Math.floor(boundingAreaMinX / Settings.CHUNK_UNITS) !== Math.floor(transformComponent.boundingAreaMinX / Settings.CHUNK_UNITS) ||
       Math.floor(boundingAreaMaxX / Settings.CHUNK_UNITS) !== Math.floor(transformComponent.boundingAreaMaxX / Settings.CHUNK_UNITS) ||
       Math.floor(boundingAreaMinY / Settings.CHUNK_UNITS) !== Math.floor(transformComponent.boundingAreaMinY / Settings.CHUNK_UNITS) ||
       Math.floor(boundingAreaMaxY / Settings.CHUNK_UNITS) !== Math.floor(transformComponent.boundingAreaMaxY / Settings.CHUNK_UNITS)) {
      updateContainingChunks(transformComponent, entity);
   }

   transformComponent.boundingAreaMinX = boundingAreaMinX;
   transformComponent.boundingAreaMaxX = boundingAreaMaxX;
   transformComponent.boundingAreaMinY = boundingAreaMinY;
   transformComponent.boundingAreaMaxY = boundingAreaMaxY;
}

export function cleanEntityTransform(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   assert(transformComponent.hitboxes.length > 0);

   for (const rootHitbox of transformComponent.rootHitboxes) {
      cleanHitboxTransformIncludingChildren(rootHitbox);
   }

   updateBoundsAndChunks(entity, transformComponent);

   transformComponent.isDirty = false;
   registerDirtyEntity(entity);
}

export const TransformComponentArray = new ComponentArray<TransformComponent>(ServerComponentType.transform, true, getDataLength, addDataToPacket);
TransformComponentArray.onInitialise = onInitialise;
TransformComponentArray.onJoin = onJoin;
TransformComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
TransformComponentArray.preRemove = preRemove;
TransformComponentArray.onRemove = onRemove;

const collideWithVerticalWorldBorder = (hitbox: Hitbox, tx: number): void => {
   const rootHitbox = getRootHitbox(hitbox);
   translateHitbox(rootHitbox, new Point(tx, 0));
   setHitboxVelocityX(rootHitbox, 0);
}

const collideWithHorizontalWorldBorder = (hitbox: Hitbox, ty: number): void => {
   const rootHitbox = getRootHitbox(hitbox);
   translateHitbox(rootHitbox, new Point(0, ty));
   setHitboxVelocityY(rootHitbox, 0);
}

export function resolveEntityBorderCollisions(transformComponent: TransformComponent): void {
   const EPSILON = 0.0001;
   
   const hitboxes = transformComponent.hitboxes;
   for (let i = 0, len = hitboxes.length; i < len; i++) {
      const hitbox = hitboxes[i];
      
      calculateBoxBounds(hitbox.box, );
      const minX = _bounds.minX;
      const maxX = _bounds.maxX;
      const minY = _bounds.minY;
      const maxY = _bounds.maxY;
      
      let hasCorrected = false;
      
      // Left border
      if (minX < 0) {
         collideWithVerticalWorldBorder(hitbox, -minX + EPSILON);
         hasCorrected = true;
      }

      // Right border
      if (maxX > Settings.WORLD_UNITS) {
         collideWithVerticalWorldBorder(hitbox, Settings.WORLD_UNITS - maxX - EPSILON);
         hasCorrected = true;
      }

      // Bottom border
      if (minY < 0) {
         hasCorrected = true;
         collideWithHorizontalWorldBorder(hitbox, -minY + EPSILON);
      }

      // Top border
      if (maxY > Settings.WORLD_UNITS) {
         hasCorrected = true;
         collideWithHorizontalWorldBorder(hitbox, Settings.WORLD_UNITS - maxY - EPSILON);
      }

      // We then need to clean the hitbox so that its children have its position updated to reflect the move
      if (hasCorrected) {
         // @SPEED if we're doing this then shouldn't we do the root hitbox recursion thing??
         const rootHitbox = getRootHitbox(hitbox);
         cleanHitboxTransformIncludingChildren(rootHitbox);

         // gotta clean the big 
         // @Speed i just slapped this in here so it has correct logic.
         cleanEntityTransform(hitbox.entity);
      }
   }

   // If the entity is outside the world border after resolving border collisions, throw an error
   // @Robustness this should be impossible to trigger, so i can remove it and sleep peacefully
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.box.posX < 0 || hitbox.box.posX >= Settings.WORLD_UNITS || hitbox.box.posY < 0 || hitbox.box.posY >= Settings.WORLD_UNITS) {
         const entity = TransformComponentArray.getEntityFromComponentNONOSQUARE(transformComponent);
         throw new Error("Unable to properly resolve border collisions for " + EntityTypeString[getEntityType(entity)] + ".");
      }
   }
}

const tickHitboxAngularPhysics = (hitbox: Hitbox, transformComponent: TransformComponent): void => {
   if (hitbox.box.relativeAngle === hitbox.previousRelativeAngle && hitbox.angularAcceleration === 0) {
      return;
   }

   // We don't use the getAngularVelocity function as that multplies it by the tps (it's the instantaneous angular velocity)
   let angularVelocityTick = getAngleDiff(hitbox.previousRelativeAngle, hitbox.box.relativeAngle);
   // @Hack??
   angularVelocityTick *= 0.98;
   
   const newAngle = hitbox.box.relativeAngle + angularVelocityTick + hitbox.angularAcceleration * Settings.DT_S * Settings.DT_S;

   hitbox.previousRelativeAngle = hitbox.box.relativeAngle;
   hitbox.box.relativeAngle = newAngle;
   hitbox.angularAcceleration = 0;

   transformComponent.isDirty = true;
   registerDirtyEntity(hitbox.entity);
}

const applyHitboxKinematics = (hitbox: Hitbox, transformComponent: TransformComponent): void => {
   if (isNaN(hitbox.box.posX) || isNaN(hitbox.box.posY)) {
      throw new Error();
   }
   
   const entity = hitbox.entity;
   const layer = getEntityLayer(entity);
   
   const tileIndex = getHitboxTile(hitbox);
   const tileType = layer.getTileType(tileIndex);

   // If the game object is in a river, push them in the flow direction of the river
   // The tileMoveSpeedMultiplier check is so that game objects on stepping stones aren't pushed
   if (hitboxIsInRiver(hitbox) && !transformComponent.overrideMoveSpeedMultiplier && transformComponent.isAffectedByGroundFriction) {
      const flowDirectionIdx = layer.riverFlowDirections[tileIndex];
      // @HACK
      applyAcceleration(hitbox, 240 * Settings.DT_S * a[flowDirectionIdx], 240 * Settings.DT_S * b[flowDirectionIdx]);
   }

   // @Cleanup: shouldn't be used by air friction.
   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tileType];
   const friction = tilePhysicsInfo.friction;
   
   let velX = hitbox.box.posX - hitbox.previousPosX;
   let velY = hitbox.box.posY - hitbox.previousPosY;

   // Air friction
   if (transformComponent.isAffectedByAirFriction) {
      // @IncompletE: shouldn't use tile friction!!
      velX *= 1 - friction * Settings.DT_S * 2;
      velY *= 1 - friction * Settings.DT_S * 2;
   }

   if (transformComponent.isAffectedByGroundFriction) {
      // Ground friction
      const velocityMagnitude = Math.hypot(velX, velY);
      if (velocityMagnitude > 0) {
         const groundFriction = Math.min(friction, velocityMagnitude);
         velX -= groundFriction * velX / velocityMagnitude * Settings.DT_S;
         velY -= groundFriction * velY / velocityMagnitude * Settings.DT_S;
      }
   }
   
   // Verlet integration update:
   // new position = current position + (damped implicit velocity) + acceleration * (dt^2)
   const newX = hitbox.box.posX + velX + hitbox.accelX * Settings.DT_S * Settings.DT_S;
   const newY = hitbox.box.posY + velY + hitbox.accelY * Settings.DT_S * Settings.DT_S;

   hitbox.previousPosX = hitbox.box.posX;
   hitbox.previousPosY = hitbox.box.posY;

   hitbox.box.posX = newX;
   hitbox.box.posY = newY;

   hitbox.accelX = 0;
   hitbox.accelY = 0;

   transformComponent.isDirty = true;
   registerDirtyEntity(entity);
}

const dirtifyPathfindingNodes = (entity: Entity, transformComponent: TransformComponent): void => {
   if (entityCanBlockPathfinding(entity)) {
      transformComponent.pathfindingNodesAreDirty = true;
   }
}

const resolveWallCollisions = (entity: Entity, transformComponent: TransformComponent): void => {
   // Looser check that there are any wall tiles in any of the entities' chunks
   let hasWallTiles = false;
   for (let i = 0; i < transformComponent.chunks.length; i++) {
      const chunk = transformComponent.chunks[i];
      if (chunk.hasWallTiles) {
         hasWallTiles = true;
      }
   }
   if (!hasWallTiles) {
      return;
   }
   
   const layer = getEntityLayer(entity);
   
   for (const hitbox of transformComponent.hitboxes) {
      if (hitboxIgnoresWallCollisions(hitbox)) {
         continue;
      }
      
      calculateBoxBounds(hitbox.box);
      const minSubtileX = Math.max(Math.floor(_bounds.minX / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
      const maxSubtileX = Math.min(Math.floor(_bounds.maxX / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
      const minSubtileY = Math.max(Math.floor(_bounds.minY / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
      const maxSubtileY = Math.min(Math.floor(_bounds.maxY / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);

      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            if (layer.subtileIsWall(subtileIndex)) {
               resolveWallCollision(hitbox, subtileX, subtileY);
            }
         }
      }
   }
}

const updatePosition = (entity: Entity, transformComponent: TransformComponent): void => {
   if (!transformComponent.isDirty) {
      return;
   }
   
   cleanEntityTransform(entity);

   // @Correctness: Is this correct? Or should we dirtify these things wherever the isDirty flag is set?
   dirtifyPathfindingNodes(entity, transformComponent);
   registerDirtyEntity(entity);

   // (Potentially introduces dirt)
   resolveWallCollisions(entity, transformComponent);

   // If the object moved due to resolving wall tile collisions, recalculate
   if (transformComponent.isDirty) {
      cleanEntityTransform(entity);
      // @Cleanup: pointless, if always done above?
      registerDirtyEntity(entity);
   }

   // (Potentially introduces dirt)
   resolveEntityBorderCollisions(transformComponent);

   // If the object moved due to resolving border collisions, recalculate
   if (transformComponent.isDirty) {
      cleanEntityTransform(entity);
      // @Cleanup: pointless, if always done above?
      registerDirtyEntity(entity);
   }

   // Check to see if the entity has descended into the underground layer
   const entityType = getEntityType(entity);
   if (entityType !== EntityType.guardian && entityType !== EntityType.guardianSpikyBall) {
      // Update the last valid layer
      const layer = getEntityLayer(entity);
      // @Hack
      const hitbox = transformComponent.hitboxes[0];
      const tileIndex = getHitboxTile(hitbox);
      if (layer.getTileType(tileIndex) !== TileType.dropdown) {
         transformComponent.lastValidLayer = layer;
      // If the layer is valid and the entity is on a dropdown, move down
      } else if (layer === transformComponent.lastValidLayer) {
         // @Temporary
         changeEntityLayer(entity, undergroundLayer);
      }
   }

   updateEntityLights(entity);
}

const tickHitboxPhysics = (hitbox: Hitbox): void => {
   // @CLEANUP
   const transformComponent = TransformComponentArray.getComponent(hitbox.entity);

   tickHitboxAngularPhysics(hitbox, transformComponent);

   updatePosition(hitbox.entity, transformComponent);

   for (const childHitbox of hitbox.children) {
      tickHitboxPhysics(childHitbox);
   }
}

// @Hack: this function used to be called from the physicscomponent, but I realised that all entities need to tick this regardless, so it's now called from the transformcomponent's onTick function. but it's still here, i guess.
const tickEntityPhysics = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const rootHitbox of transformComponent.rootHitboxes) {
      // Apply kinematics to only the root hitboxes
      applyHitboxKinematics(rootHitbox, transformComponent);
      
      tickHitboxPhysics(rootHitbox);
   }

   // @Speed: what if the hitboxes don't change?
   // (just for carried entities)
   if (transformComponent.rootHitboxes.length > 0) {
      registerDirtyEntity(entity);
   }
}

function onInitialise(config: EntityConfig, entity: Entity): void {
   // This used to be done in the onJoin function, but since entities can now be attached just before the onJoin functions
   // are called, we have to initialise the root entity before that.
   const transformComponent = getConfigTransformComponent(config.components);
   for (const hitbox of transformComponent.hitboxes) {
      hitbox.entity = entity;
      if (hitbox.rootEntity === 0) {
         hitbox.rootEntity = entity;
      }
   }
}

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   transformComponent.lastValidLayer = getEntityLayer(entity);
   
   // @Cleanup: This is so similar to the updatePosition function
   
   cleanEntityTransform(entity);

   resolveEntityBorderCollisions(transformComponent);
   if (transformComponent.isDirty) {
      cleanEntityTransform(entity);
   }

   // @Cleanup: should i make a separate PathfindingOccupancyComponent?
   if (entityCanBlockPathfinding(entity)) {
      addEntityToPathfinding(entity);
      updateEntityPathfindingNodeOccupance(entity, transformComponent);
   }

   updateEntityLights(entity);

   addEntityTethersToWorld(transformComponent);
}

function onTick(entity: Entity): void {
   // @Speed: func call
   tickEntityPhysics(entity);
}

function preRemove(entity: Entity): void {
   // Destroy all sub-parts
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (hitboxIsPartOfParent(childHitbox)) {
            destroyEntity(childHitbox.entity);
         }
      }
   }
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (const hitbox of transformComponent.hitboxes) {
      // Detach any of the entities' hitboxes which are attached to another entities' hitbox
      if (hitbox.parent !== null && hitbox.parent.entity !== entity) {
         detachHitbox(hitbox);
      }

      // Untether all tethers
      // @Speed: only need to untether from the OTHER hitbox not both. Then it will get sucked up automatically.
      const tethers = getHitboxTethers(hitbox);
      if (tethers !== undefined) {
         for (let i = tethers.length - 1; i >= 0; i--) {
            const tether = tethers[i];
            destroyTether(tether);
         }
      }

      // Detach all children
      for (let i = hitbox.children.length - 1; i >= 0; i--) {
         const childHitbox = hitbox.children[i];
         if (childHitbox.entity !== entity) {
            detachHitbox(childHitbox);
         }
      }
   }
   
   // Remove from chunks
   const layer = getEntityLayer(entity);
   for (let i = 0; i < transformComponent.chunks.length; i++) {
      const chunk = transformComponent.chunks[i];
      removeFromChunk(entity, layer, chunk);
   }

   // @Cleanup: Same as above. should i make a separate PathfindingOccupancyComponent?
   if (entityCanBlockPathfinding(entity)) {
      removeEntityFromPathfinding(entity);
      clearEntityPathfindingNodes(entity);
   }

   removeEntityLights(entity);
}

function getDataLength(entity: Entity): number {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Traction
   let lengthBytes = Bytes.Float32;
   
   // Hitboxes
   lengthBytes += Bytes.Float32;
   for (const hitbox of transformComponent.hitboxes) {
      lengthBytes += getHitboxDataLength(hitbox);
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   packet.writeNumber(transformComponent.traction);
   
   packet.writeNumber(transformComponent.hitboxes.length);
   for (const hitbox of transformComponent.hitboxes) {
      addHitboxDataToPacket(packet, hitbox);
   }
}

const propagateRootEntityChange = (hitbox: Hitbox, rootEntity: Entity): void => {
   hitbox.rootEntity = rootEntity;
   registerDirtyEntity(hitbox.entity);
   
   for (const childHitbox of hitbox.children) {
      propagateRootEntityChange(childHitbox, rootEntity);
   }
}

export function attachHitboxRaw(hitbox: Hitbox, parentHitbox: Hitbox, isPartOfParent: boolean): void {
   assert(hitbox.rootEntity !== parentHitbox.rootEntity);
   assert(hitbox.parent === null);
   assert(!parentHitbox.children.includes(hitbox));
   
   propagateRootEntityChange(hitbox, parentHitbox.rootEntity);
   hitbox.parent = parentHitbox;
   setHitboxIsPartOfParent(hitbox, isPartOfParent);
   hitbox.parent.children.push(hitbox);
   
   registerDirtyEntity(hitbox.entity);
   registerDirtyEntity(parentHitbox.entity);
}

export function attachHitbox(hitbox: Hitbox, parentHitbox: Hitbox, isPartOfParent: boolean): void {
   attachHitboxRaw(hitbox, parentHitbox, isPartOfParent);
   
   // Once the entity gets attached, it's going to have the parent hitboxes' angle added to it, so subtract it now.
   // Adjust the child's relative rotation so that it stays pointed in the same direction relative to the parent
   hitbox.box.relativeAngle -= parentHitbox.box.angle;
   hitbox.previousRelativeAngle -= parentHitbox.box.angle;

   const diffX = hitbox.box.posX - parentHitbox.box.posX;
   const diffY = hitbox.box.posY - parentHitbox.box.posY;

   rotatePointAroundOrigin(diffX, diffY, -parentHitbox.box.angle);
   hitbox.box.offsetX = _point.x;
   hitbox.box.offsetY = _point.y;

   const parentVelocity = getHitboxVelocity(parentHitbox);
   setHitboxVelocity(hitbox, parentVelocity.x, parentVelocity.y);

   // Clear acceleration. From this point any acceleration applied to this hitbox should instead be applied to the root hitbox
   hitbox.accelX = 0;
   hitbox.accelY = 0;
}

// @Copynpaste !
export function attachEntityWithTether(entity: Entity, parent: Entity, parentHitbox: Hitbox | null, idealDistance: number, springConstant: number, damping: number, destroyWhenParentIsDestroyed: boolean): void {
   assert(entity !== parent);

   throw new Error();
   
   // @INCOMPLETE

   // const entityTransformComponent = TransformComponentArray.getComponent(entity);
   // const parentTransformComponent = TransformComponentArray.getComponent(parent);
   
   // entityTransformComponent.rootEntity = parentTransformComponent.rootEntity;
   // entityTransformComponent.parentEntity = parent;

   // if (parentHitbox !== null) {
   //    if (entityTransformComponent.rootChildren.length > 1) {
   //       // don't want the same angular tether to be referenced in multiple hitboxes.
   //       throw new Error();
   //    }
   //    // Attach all root hitboxes to the parent hitbox
   //    for (const rootHitbox of entityTransformComponent.rootChildren) {
   //       if (entityChildIsHitbox(rootHitbox)) {
   //          // Note: we don't add the child to the parent's children array as we can't have hitboxes be related between entities.

   //          // Don't set 'rootHitbox.parent = parentHitbox' as that would imply that the 
   //          rootHitbox.parent = parentHitbox;

   //          // @Incomplete: why don't we set the offset here like in the non-tether function??

   //          // @Incomplete !
   //          tetherHitboxes(rootHitbox, parentHitbox, entityTransformComponent, parentTransformComponent, idealDistance, springConstant, damping);
   //       }
   //    }
   // }
   
   // const attachInfo: EntityAttachInfo = {
   //    attachedEntity: entity,
   //    parentHitbox: parentHitbox,
   //    destroyWhenParentIsDestroyed: destroyWhenParentIsDestroyed
   // };
   // parentTransformComponent.children.push(attachInfo);

   // registerDirtyEntity(entity);
   // registerDirtyEntity(parent);
}

/** Detatches a hitbox from its parent. */
export function detachHitbox(hitbox: Hitbox): void {
   if (hitbox.parent === null) {
      return;
   }

   // @HACK @location @Cleanup This used to be in the dismountMount function but it wasn't being called when the rider was detached without going through the dismount function.
   if (hitbox.parent !== null && RideableComponentArray.hasComponent(hitbox.parent.entity)) {
      const rideableComponent = RideableComponentArray.getComponent(hitbox.parent.entity);

      let carrySlot: CarrySlot | undefined;
      for (const currentCarrySlot of rideableComponent.carrySlots) {
         if (currentCarrySlot.occupiedEntity === hitbox.entity) {
            carrySlot = currentCarrySlot;
            break;
         }
      }

      if (carrySlot !== undefined) {
         carrySlot.occupiedEntity = 0;
      }
   }

   // Make sure that the hitbox hasn't accumulated any acceleration before it's detached
   // becuase if it has then it'll appear glitchy in the clientside
   assert(hitbox.accelX === 0 && hitbox.accelY === 0);

   const idx = hitbox.parent.children.indexOf(hitbox);
   assert(idx !== -1);
   hitbox.parent.children.splice(idx, 1);
            
   hitbox.box.relativeAngle += hitbox.parent.box.angle;
   hitbox.previousRelativeAngle += hitbox.parent.box.angle;

   // Remove any tethers to the parent hitbox
   const tethers = getHitboxTethers(hitbox);
   if (tethers !== undefined) {
      for (let i = tethers.length - 1; i >= 0; i--) {
         const tether = tethers[i];
         const otherHitbox = tether.getOtherHitbox(hitbox);
         if (otherHitbox === hitbox.parent) {
            destroyTether(tether);
            break;
         }
      }
   }

   registerDirtyEntity(hitbox.parent.entity);
   registerDirtyEntity(hitbox.entity);

   hitbox.parent = null;
   propagateRootEntityChange(hitbox, hitbox.entity);
}

export function getRandomPositionInBox(box: Box): Point {
   if (boxIsCircular(box)) {
      const offset = polarVec2(box.radius * Math.random(), randAngle());
      return new Point(box.posX + offset.x, box.posY + offset.y);
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      rotatePointAroundOrigin(xOffset, yOffset, box.angle);
      const x = box.posX + _point.x;
      const y = box.posY + _point.y;
      return new Point(x, y);
   }
}

const getOwnedHitboxArea = (hitbox: Hitbox): number => {
   let area = getBoxArea(hitbox.box);

   for (const childHitbox of hitbox.children) {
      if (hitboxIsPartOfParent(childHitbox)) {
         area += getBoxArea(childHitbox.box);
      }
   }

   return area;
}

const getTotalEntityArea = (transformComponent: TransformComponent): number => {
   let area = 0;
   for (const rootHitbox of transformComponent.rootHitboxes) {
      area += getOwnedHitboxArea(rootHitbox);
   }
   return area;
}

const getWeightedHitbox = (hitbox: Hitbox, currentArea: number, targetArea: number): Hitbox | number => {
   let area = currentArea;

   area += getBoxArea(hitbox.box);
   if (area >= targetArea) {
      return hitbox;
   }

   for (const childHitbox of hitbox.children) {
      if (hitboxIsPartOfParent(childHitbox)) {
         const result = getWeightedHitbox(childHitbox, area, targetArea);
         if (typeof result === "number") {
            area = result;
         } else {
            return result;
         }
      }
   }

   return area;
}

const getEntityWeightedHitbox = (transformComponent: TransformComponent, targetArea: number): Hitbox => {
   let area = 0;

   for (const rootHitbox of transformComponent.rootHitboxes) {
      const result = getWeightedHitbox(rootHitbox, area, targetArea);
      if (typeof result === "number") {
         area = result;
      } else {
         return result;
      }
   }

   throw new Error();
}

export function getRandomWeightedHitbox(transformComponent: TransformComponent): Hitbox {
   const targetWeight = Math.random() * getTotalEntityArea(transformComponent);
   return getEntityWeightedHitbox(transformComponent, targetWeight);
}

export function getRandomPositionInEntity(transformComponent: TransformComponent): Point {
   const hitbox = getRandomWeightedHitbox(transformComponent);
   return getRandomPositionInBox(hitbox.box);
}

const changeEntityLayerImpl = (entity: Entity, newLayer: Layer): void => {
   // @Correctness should probably instead collate all layer changes then do them all at once at the end of a tick
   
   const previousLayer = getEntityLayer(entity);

   const transformComponent = TransformComponentArray.getComponent(entity);

   if (newLayer !== previousLayer) {
      // Remove from previous chunks
      while (transformComponent.chunks.length > 0) {
         const chunk = transformComponent.chunks[0];
         removeFromChunk(entity, previousLayer, chunk);
         transformComponent.chunks.splice(0, 1);
      }

      // Add to the new ones
      // @Cleanup: this logic should be in transformcomponent, perhaps there is a function which already does this...
      const minChunkX = Math.max(Math.floor(transformComponent.boundingAreaMinX / Settings.CHUNK_UNITS), 0);
      const maxChunkX = Math.min(Math.floor(transformComponent.boundingAreaMaxX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
      const minChunkY = Math.max(Math.floor(transformComponent.boundingAreaMinY / Settings.CHUNK_UNITS), 0);
      const maxChunkY = Math.min(Math.floor(transformComponent.boundingAreaMaxY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const newChunk = newLayer.getChunk(chunkX, chunkY);
            addToChunk(entity, newLayer, newChunk);
            transformComponent.chunks.push(newChunk);
         }
      }

      setEntityLayer(entity, newLayer);
   }

   // Propagate the layer change to any attached entities
   for (const hitbox of transformComponent.hitboxes) {
      for (const child of hitbox.children) {
         if (child.entity !== entity) {
            changeEntityLayerImpl(child.entity, newLayer);
         }
      }
   }
}

export function changeEntityLayer(entity: Entity, newLayer: Layer): void {
   // @Hack?
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const rootEntity = hitbox.rootEntity;
   changeEntityLayerImpl(rootEntity, newLayer);
}