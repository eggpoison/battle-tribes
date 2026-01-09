import { Entity, EntityType, boxIsCircular, updateBox, Box, ServerComponentType, PacketReader, randFloat, TILE_PHYSICS_INFO_RECORD, TileType, Settings, assert, customTickIntervalHasPassed, getAngleDiff, lerp, Point, randAngle, randInt, randSign, rotateXAroundOrigin, rotateYAroundOrigin, getTileIndexIncludingEdges } from "webgl-test-shared";
import Chunk from "../../Chunk";
import { EntityComponentData, getCurrentLayer, getEntityAgeTicks, getEntityLayer, getEntityType, surfaceLayer, undergroundLayer } from "../../world";
import Board from "../../Board";
import ServerComponentArray from "../ServerComponentArray";
import { playerInstance } from "../../player";
import { applyAccelerationFromGround, getHitboxAngularVelocity, getHitboxTile, getHitboxVelocity, getRandomPositionInBox, getRootHitbox, Hitbox, readHitboxFromData, setHitboxVelocity, setHitboxVelocityX, setHitboxVelocityY, translateHitbox, updateHitboxFromData, updatePlayerHitboxFromData } from "../../hitboxes";
import Particle from "../../Particle";
import { createWaterSplashParticle } from "../../particles";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { playSoundOnHitbox } from "../../sound";
import { entitiesAreColliding, resolveWallCollisions } from "../../collision";
import { keyIsPressed } from "../../keyboard-input";
import { currentSnapshot } from "../../client";
import { gameUIState } from "../../../ui-state/game-ui-state.svelte";
import { entitySelectionState } from "../../../ui-state/entity-selection-state.svelte";
import { worldToScreenPos } from "../../camera";

export interface TransformComponentData {
   readonly traction: number;
   readonly hitboxes: ReadonlyArray<Hitbox>;
}

export interface TransformComponent {
   readonly chunks: Set<Chunk>;

   hitboxes: Array<Hitbox>;
   readonly hitboxMap: Map<number, Hitbox>;

   readonly rootHitboxes: Array<Hitbox>;

   boundingAreaMinX: number;
   boundingAreaMaxX: number;
   boundingAreaMinY: number;
   boundingAreaMaxY: number;

   traction: number;

   ignoredTileSpeedMultipliers: ReadonlyArray<TileType>;
}

// We use this so that a component tries to override the empty array with the same empty
// array, instead of a different empty array which would cause garbage collection
const EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS = new Array<TileType>();

export function createTransformComponentData(hitboxes: Array<Hitbox>): TransformComponentData {
   return {
      traction: 1,
      hitboxes: hitboxes
   };
}

function decodeData(reader: PacketReader): TransformComponentData {
   const traction = reader.readNumber();

   const hitboxes = new Array<Hitbox>();
   
   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const localID = reader.readNumber();
      const hitboxData = readHitboxFromData(reader, localID, hitboxes);
      hitboxes.push(hitboxData);
   }

   return {
      traction: traction,
      hitboxes: hitboxes
   };
}

// @HACKK
export function resetIgnoredTileSpeedMultipliers(transformComponent: TransformComponent): void {
   transformComponent.ignoredTileSpeedMultipliers = EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS;
}

const addHitbox = (transformComponent: TransformComponent, hitbox: Hitbox): void => {
   transformComponent.hitboxes.push(hitbox);
   transformComponent.hitboxMap.set(hitbox.localID, hitbox);

   if (hitbox.parent === null) {
      transformComponent.rootHitboxes.push(hitbox);
   } else {
      // @CLEANUP: completely unnecessary??
      const parent = hitbox.parent;
      updateBox(hitbox.box, parent.box);
   }
}
   
export function removeHitboxFromEntity(transformComponent: TransformComponent, hitbox: Hitbox, idx: number): void {
   transformComponent.hitboxes.splice(idx, 1);
   transformComponent.hitboxMap.delete(hitbox.localID);

   if (hitbox.parent === null) {
      const idx = transformComponent.rootHitboxes.indexOf(hitbox);
      assert(idx !== -1);
      transformComponent.rootHitboxes.splice(idx, 1);
   }
}

export function hitboxIsInRiver(hitbox: Hitbox): boolean {
   const tile = getHitboxTile(hitbox);
   if (tile.type !== TileType.water) {
      return false;
   }
   
   // If the hitbox is standing on a stepping stone they aren't in a river

   const box = hitbox.box;
   const layer = getEntityLayer(hitbox.entity);

   const minX = box.calculateBoundsMinX();
   const maxX = box.calculateBoundsMaxX();
   const minY = box.calculateBoundsMinY();
   const maxY = box.calculateBoundsMaxY();

   const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   
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

/** Recalculates which chunks the game object is contained in */
const updateContainingChunks = (transformComponent: TransformComponent, entity: Entity): void => {
   const layer = getEntityLayer(entity);
   const containingChunks = new Set<Chunk>();
   
   // Find containing chunks
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;

      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();

      const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            containingChunks.add(chunk);
         }
      }
   }

   // Find all chunks which aren't present in the new chunks and remove them
   for (const chunk of transformComponent.chunks) {
      if (!containingChunks.has(chunk)) {
         chunk.removeEntity(entity);
         transformComponent.chunks.delete(chunk);
      }
   }

   // Add all new chunks
   for (const chunk of containingChunks) {
      if (!transformComponent.chunks.has(chunk)) {
         chunk.addEntity(entity);
         transformComponent.chunks.add(chunk);
      }
   }
}

const cleanHitboxIncludingChildrenTransform = (hitbox: Hitbox): void => {
   if (hitbox.parent === null) {
      hitbox.box.angle = hitbox.box.relativeAngle;
   } else {
      updateBox(hitbox.box, hitbox.parent.box);
      // @Cleanup: maybe should be done in the updatebox function?? if it become updateHitbox??
      const parentVelocity = getHitboxVelocity(hitbox.parent);
      // @Speed: updating the box already sets its position, so we only need to set its previousPosition.
      setHitboxVelocity(hitbox, parentVelocity.x, parentVelocity.y);
   }

   for (const childHitbox of hitbox.children) {
      cleanHitboxIncludingChildrenTransform(childHitbox);
   }
}

export function cleanEntityTransform(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   for (const rootHitbox of transformComponent.rootHitboxes) {
      cleanHitboxIncludingChildrenTransform(rootHitbox);
   }

   transformComponent.boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   transformComponent.boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   transformComponent.boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   transformComponent.boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;

      const boundsMinX = box.calculateBoundsMinX();
      const boundsMaxX = box.calculateBoundsMaxX();
      const boundsMinY = box.calculateBoundsMinY();
      const boundsMaxY = box.calculateBoundsMaxY();

      // Update bounding area
      if (boundsMinX < transformComponent.boundingAreaMinX) {
         transformComponent.boundingAreaMinX = boundsMinX;
      }
      if (boundsMaxX > transformComponent.boundingAreaMaxX) {
         transformComponent.boundingAreaMaxX = boundsMaxX;
      }
      if (boundsMinY < transformComponent.boundingAreaMinY) {
         transformComponent.boundingAreaMinY = boundsMinY;
      }
      if (boundsMaxY > transformComponent.boundingAreaMaxY) {
         transformComponent.boundingAreaMaxY = boundsMaxY;
      }
   }

   updateContainingChunks(transformComponent, entity);
}

const tickHitboxAngularPhysics = (hitbox: Hitbox): void => {
   // @Cleanup useless/pointless if it doesn't get dirtied in this func?
   if (hitbox.box.relativeAngle === hitbox.previousRelativeAngle && hitbox.angularAcceleration === 0) {
      return;
   }

   // We don't use the getAngularVelocity function as that multplies it by the tps (it's the instantaneous angular velocity)
   let angularVelocityTick = getAngleDiff(hitbox.previousRelativeAngle, hitbox.box.relativeAngle);
   // @Hack??
   angularVelocityTick *= 0.98;
   
   const newRelativeAngle = hitbox.box.relativeAngle + angularVelocityTick + hitbox.angularAcceleration * Settings.DT_S * Settings.DT_S;

   hitbox.previousRelativeAngle = hitbox.box.relativeAngle;
   hitbox.box.relativeAngle = newRelativeAngle;
}

const applyHitboxKinematics = (hitbox: Hitbox): void => {
   if (isNaN(hitbox.box.position.x) || isNaN(hitbox.box.position.y)) {
      throw new Error("Position was NaN.");
   }

   const layer = getEntityLayer(hitbox.entity);
   const tile = getHitboxTile(hitbox);

   if (isNaN(hitbox.box.position.x)) {
      throw new Error("Position was NaN.");
   }

   // @Incomplete: here goes fish suit exception
   // Apply river flow to external velocity
   if (hitboxIsInRiver(hitbox)) {
      const flowDirection = layer.getRiverFlowDirection(tile.x, tile.y);
      if (flowDirection > 0) {
         applyAccelerationFromGround(hitbox, 240 * Settings.DT_S * Math.sin(flowDirection - 1), 240 * Settings.DT_S * Math.cos(flowDirection - 1));
      }
   }

   const tilePhysicsInfo = TILE_PHYSICS_INFO_RECORD[tile.type];
   const tileFriction = tilePhysicsInfo.friction;

   let velX = hitbox.box.position.x - hitbox.previousPosition.x;
   let velY = hitbox.box.position.y - hitbox.previousPosition.y;
      
   // Air friction
   // @Bug? the tile's friction shouldn't affect air friction?
   velX *= 1 - tileFriction * Settings.DT_S * 2;
   velY *= 1 - tileFriction * Settings.DT_S * 2;

   // Ground friction
   const velocityMagnitude = Math.hypot(velX, velY);
   if (velocityMagnitude > 0) {
      const groundFriction = Math.min(tileFriction, velocityMagnitude);
      velX -= groundFriction * velX / velocityMagnitude * Settings.DT_S;
      velY -= groundFriction * velY / velocityMagnitude * Settings.DT_S;
   }
   
   // Verlet integration update:
   // new position = current position + (damped implicit velocity) + acceleration * (dt^2)
   const newX = hitbox.box.position.x + velX + hitbox.acceleration.x * Settings.DT_S * Settings.DT_S;
   const newY = hitbox.box.position.y + velY + hitbox.acceleration.y * Settings.DT_S * Settings.DT_S;

   hitbox.previousPosition.x = hitbox.box.position.x;
   hitbox.previousPosition.y = hitbox.box.position.y;

   hitbox.box.position.x = newX;
   hitbox.box.position.y = newY;

   hitbox.acceleration.x = 0;
   hitbox.acceleration.y = 0;

   // Mark entity's position as updated
   cleanEntityTransform(hitbox.entity);
}

const collideWithVerticalWorldBorder = (hitbox: Hitbox, tx: number): void => {
   const rootHitbox = getRootHitbox(hitbox);
   translateHitbox(rootHitbox, tx, 0);
   setHitboxVelocityX(rootHitbox, 0);
}

const collideWithHorizontalWorldBorder = (hitbox: Hitbox, ty: number): void => {
   const rootHitbox = getRootHitbox(hitbox);
   translateHitbox(rootHitbox, 0, ty);
   setHitboxVelocityY(rootHitbox, 0);
}

const resolveAndCleanBorderCollisions = (entity: Entity, transformComponent: TransformComponent): void => {
   const EPSILON = 0.0001;
   
   let hasCorrected = false;
   for (const hitbox of transformComponent.hitboxes) {
      
      // Left border
      const minX = hitbox.box.calculateBoundsMinX();
      if (minX < 0) {
         collideWithVerticalWorldBorder(hitbox, -minX + EPSILON);
         hasCorrected = true;
      }

      // Right border
      const maxX = hitbox.box.calculateBoundsMaxX();
      if (maxX > Settings.WORLD_UNITS) {
         collideWithVerticalWorldBorder(hitbox, Settings.WORLD_UNITS - maxX - EPSILON);
         hasCorrected = true;
      }

      // Bottom border
      const minY = hitbox.box.calculateBoundsMinY();
      if (minY < 0) {
         hasCorrected = true;
         collideWithHorizontalWorldBorder(hitbox, -minY + EPSILON);
      }

      // Top border
      const maxY = hitbox.box.calculateBoundsMaxY();
      if (maxY > Settings.WORLD_UNITS) {
         hasCorrected = true;
         collideWithHorizontalWorldBorder(hitbox, Settings.WORLD_UNITS - maxY - EPSILON);
      }

      // We then need to clean the hitbox so that its children have its position updated to reflect the move
      if (hasCorrected) {
         // we gotta clean the whole transform now, not just the hitbox tree, so that the big bounds are correct
         cleanEntityTransform(entity);
      }
   }

   // If the entity is outside the world border after resolving border collisions, throw an error
   // @Robustness this should be impossible to trigger, so i can remove it and sleep peacefully
   // @CRASH if i hyperspeed into the top right
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.box.calculateBoundsMinX() < 0 || hitbox.box.calculateBoundsMaxX() >= Settings.WORLD_UNITS || hitbox.box.calculateBoundsMinY() < 0 || hitbox.box.calculateBoundsMaxY() >= Settings.WORLD_UNITS) {
         throw new Error();
      }
   }
}

// @INCOMPLETE
// const applyHitboxTethers = (hitbox: Hitbox, onlyAffectSelf: boolean): void => {
const applyHitboxTethers = (hitbox: Hitbox): void => {
   // Apply the spring physics
   for (const tether of hitbox.tethers) {
      const originBox = tether.originBox;

      const diffX = originBox.position.x - hitbox.box.position.x;
      const diffY = originBox.position.y - hitbox.box.position.y;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);
      if (distance === 0) {
         continue;
      }

      const normalisedDiffX = diffX / distance;
      const normalisedDiffY = diffY / distance;

      const displacement = distance - tether.idealDistance;
      
      // Calculate spring force
      const springForceX = normalisedDiffX * tether.springConstant * displacement;
      const springForceY = normalisedDiffY * tether.springConstant * displacement;
      
      hitbox.acceleration.x += springForceX / hitbox.mass;
      hitbox.acceleration.y += springForceY / hitbox.mass;
      // For ticking the player, we only want to affect the player's own tethers.
      // if (!onlyAffectSelf) {
         // @INCOMPLETE this no worky
         // originBox.acc
      // }
   }

}
const tickHitboxPhysics = (hitbox: Hitbox): void => {
   // @Hackish We don't update the player's angular physics cuz it's handled entirely by the updatePlayerRotation function.
   if (hitbox.entity !== playerInstance) {
      tickHitboxAngularPhysics(hitbox);
   }

   if (hitbox.parent === null) {
      applyHitboxKinematics(hitbox);
   }
   
   // @Incomplete
   // applyHitboxTethers(hitbox, transformComponent);

   for (const childHitbox of hitbox.children) {
      tickHitboxPhysics(childHitbox);
   }
}

export const TransformComponentArray = new ServerComponentArray<TransformComponent, TransformComponentData, never>(ServerComponentType.transform, false, createComponent, getMaxRenderParts, decodeData);
TransformComponentArray.onLoad = onLoad;
TransformComponentArray.updateFromData = updateFromData;
TransformComponentArray.onTick = onTick;
TransformComponentArray.onUpdate = onUpdate;
TransformComponentArray.onRemove = onRemove;
TransformComponentArray.updatePlayerFromData = updatePlayerFromData;
TransformComponentArray.updateSelectedEntityState = updateSelectedEntityState;

function createComponent(entityComponentData: EntityComponentData): TransformComponent {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   
   const hitboxes = new Array<Hitbox>();
   const rootHitboxes = new Array<Hitbox>();
   const hitboxMap = new Map<number, Hitbox>();
   for (const hitbox of transformComponentData.hitboxes) {
      // Set all the hitboxes' last update ticks, since they default to 0 and it has to be done here.
      hitbox.lastUpdateTicks = currentSnapshot.tick;
      
      hitboxes.push(hitbox);
      hitboxMap.set(hitbox.localID, hitbox);
      if (hitbox.parent === null) {
         rootHitboxes.push(hitbox);
      }
   }

   return {
      chunks: new Set(),
      hitboxes: hitboxes,
      hitboxMap: hitboxMap,
      rootHitboxes: rootHitboxes,
      boundingAreaMinX: Number.MAX_SAFE_INTEGER,
      boundingAreaMaxX: Number.MIN_SAFE_INTEGER,
      boundingAreaMinY: Number.MAX_SAFE_INTEGER,
      boundingAreaMaxY: Number.MIN_SAFE_INTEGER,
      traction: transformComponentData.traction,
      ignoredTileSpeedMultipliers: EMPTY_IGNORED_TILE_SPEED_MULTIPLIERS.slice()
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function onLoad(entity: Entity): void {
   cleanEntityTransform(entity);
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   if (hitboxIsInRiver(hitbox)) {
      // Water droplet particles
      // @Hack @Cleanup: Don't hardcode fish condition
      if (customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.05) && (getEntityType(entity) !== EntityType.fish)) {
         createWaterSplashParticle(hitbox.box.position.x, hitbox.box.position.y);
      }

      // Water splash particles
      // @Cleanup: Move to particles file
      if (customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.15) && getHitboxVelocity(hitbox).magnitude() > 0 && getEntityType(entity) !== EntityType.fish) {
         const lifetime = 2.5;

         const particle = new Particle(lifetime);
         particle.getOpacity = (): number => {
            return lerp(0.75, 0, Math.sqrt(particle.age / lifetime));
         }
         particle.getScale = (): number => {
            return 1 + particle.age / lifetime * 1.4;
         }

         addTexturedParticleToBufferContainer(
            particle,
            ParticleRenderLayer.low,
            64, 64,
            hitbox.box.position.x, hitbox.box.position.y,
            0, 0, 
            0, 0,
            0,
            randAngle(),
            0,
            0,
            0,
            8 * 1 + 5,
            0, 0, 0
         );
         Board.lowTexturedParticles.push(particle);

         playSoundOnHitbox("water-splash-" + randInt(1, 3) + ".mp3", 0.25, 1, entity, hitbox, false);
      }
   }
}

function onUpdate(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent.boundingAreaMinX < 0 || transformComponent.boundingAreaMaxX >= Settings.WORLD_UNITS || transformComponent.boundingAreaMinY < 0 || transformComponent.boundingAreaMaxY >= Settings.WORLD_UNITS) {
      // @BUG @HACK: This warning should not be a thing. This can occur if I mistakenly set the player spawn position to be outside of the world, then this runs on the player.
      
      console.warn("wat")
      return;
   }

   for (const child of transformComponent.hitboxes) {
      const hitbox = child;
      applyHitboxTethers(hitbox);
   }
   
   for (const rootHitbox of transformComponent.rootHitboxes) {
      tickHitboxPhysics(rootHitbox);
   }

   // @Speed: only do if the kinematics moved the entity
   cleanEntityTransform(entity);
   
   // Don't resolve wall tile collisions in lightspeed mode
   if (!(entity === playerInstance && keyIsPressed("l"))) { 
      const hasMoved = resolveWallCollisions(entity);

      if (hasMoved) {
         cleanEntityTransform(entity);
      }
   }

   resolveAndCleanBorderCollisions(entity, transformComponent);

   if (transformComponent.boundingAreaMinX < 0 || transformComponent.boundingAreaMaxX >= Settings.WORLD_UNITS || transformComponent.boundingAreaMinY < 0 || transformComponent.boundingAreaMaxY >= Settings.WORLD_UNITS) {
      throw new Error();
   }
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const chunk of transformComponent.chunks) {
      chunk.removeEntity(entity);
   }
}

function updateFromData(data: TransformComponentData, entity: Entity): void {
   // @SPEED: What we could do is explicitly send which hitboxes have been created, and removed, from the server. (When using carmack networking)
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // @Speed: would be faster if we split the hitboxes array
   let existingNumCircular = 0;
   let existingNumRectangular = 0;
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (boxIsCircular(hitbox.box)) {
         existingNumCircular++;
      } else {
         existingNumRectangular++;
      }
   }

   let anyHitboxHasVelocity = false;
   
   // Update hitboxes
   for (const hitboxData of data.hitboxes) {
      let hitbox = transformComponent.hitboxMap.get(hitboxData.localID);
      if (typeof hitbox === "undefined") {
         addHitbox(transformComponent, hitboxData);
         hitbox = hitboxData;
      } else {
         updateHitboxFromData(hitbox, hitboxData);
         // @SQUEAM
         // if (getEntityType(entity) === EntityType.heldItem) {
         //    console.log(hitbox.box.angle);
         // }
      }

      if (!getHitboxVelocity(hitbox).isZero()) {
         anyHitboxHasVelocity = true;
         // @Temporary @Squeam for optimisation
         const entityType = getEntityType(entity);
         if (entityType === EntityType.decoration || entityType === EntityType.lilypad || entityType === EntityType.reed) {
            console.log(hitbox);
            throw new Error();
         }
      }
   }

   if (anyHitboxHasVelocity) {
      TransformComponentArray.activateComponent(transformComponent, entity);
   } else if (TransformComponentArray.componentIsActive(entity)) {
      TransformComponentArray.queueComponentDeactivate(entity);
   }

   transformComponent.traction = data.traction;

   // Remove hitboxes which no longer exist
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitbox.lastUpdateTicks !== currentSnapshot.tick) {
         // Hitbox is removed!
         removeHitboxFromEntity(transformComponent, hitbox, i);
         i--;
      }
   }

   cleanEntityTransform(entity);
}

function updatePlayerFromData(data: TransformComponentData, isInitialData: boolean): void {
   if (isInitialData) {
      updateFromData(data, playerInstance!);
      return;
   }

   // @Copynpaste
   let anyHitboxHasVelocity = false;

   const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   for (const hitboxData of data.hitboxes) {
      const hitbox = transformComponent.hitboxMap.get(hitboxData.localID);
      assert(typeof hitbox !== "undefined");
      updatePlayerHitboxFromData(hitbox, hitboxData);

      // @Copynpaste
      if (!getHitboxVelocity(hitbox).isZero()) {
         anyHitboxHasVelocity = true;
      }
   }

   // @Copynpaste
   if (anyHitboxHasVelocity) {
      TransformComponentArray.activateComponent(transformComponent, playerInstance!);
   } else if (TransformComponentArray.componentIsActive(playerInstance!)) {
      TransformComponentArray.queueComponentDeactivate(playerInstance!);
   }

   let canAscendLayer = false;
   if (getCurrentLayer() === undergroundLayer) {
      const hitbox = transformComponent.hitboxes[0];
      const tile = getHitboxTile(hitbox);
      const tileIndex = getTileIndexIncludingEdges(tile.x, tile.y);
      const tileAbove = surfaceLayer.getTile(tileIndex);
      if (tileAbove.type === TileType.dropdown) {
         canAscendLayer = true;
      }
   }
   gameUIState.setCanAscendLayer(canAscendLayer);
}

function updateSelectedEntityState(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const screenPos = worldToScreenPos(hitbox.box.position);
   entitySelectionState.setSelectedEntityScreenPosX(screenPos.x);
   entitySelectionState.setSelectedEntityScreenPosY(screenPos.y);
}

const countHitboxesIncludingChildren = (hitbox: Hitbox): number => {
   let numHitboxes = 1;
   for (const childHitbox of hitbox.children) {
      if (childHitbox.isPartOfParent) {
         numHitboxes += countHitboxesIncludingChildren(childHitbox);
      }
   }
   return numHitboxes;
}

const countEntityHitboxes = (transformComponent: TransformComponent): number => {
   let numHitboxes = 0;
   for (const rootHitbox of transformComponent.rootHitboxes) {
      numHitboxes += countHitboxesIncludingChildren(rootHitbox);
   } 
   return numHitboxes;
}

const getHitboxHeirarchyIndexedHitbox = (hitbox: Hitbox, i: number, hitboxIdx: number): Hitbox | number => {
   let newI = i;

   if (newI === hitboxIdx) {
      return hitbox;
   }
   
   newI++;

   for (const childHitbox of hitbox.children) {
      const result = getHitboxHeirarchyIndexedHitbox(childHitbox, newI, hitboxIdx);
      if (typeof result === "number") {
         newI = result;
      } else {
         return result;
      }
   }
   
   return newI;
}

const getEntityHeirarchyIndexedHitbox = (transformComponent: TransformComponent, i: number, hitboxIdx: number): Hitbox | number => {
   let _i = 0;

   for (const rootHitbox of transformComponent.rootHitboxes) {
      const result = getHitboxHeirarchyIndexedHitbox(rootHitbox, _i, hitboxIdx);
      if (typeof result === "number") {
         _i = result;
      } else {
         return result;
      }
   }

   throw new Error();
}

export function getRandomPositionInEntity(transformComponent: TransformComponent): Point {
   const numHitboxes = countEntityHitboxes(transformComponent);
   const hitboxIdx = Math.floor(Math.random() * numHitboxes);
   
   const hitbox = getEntityHeirarchyIndexedHitbox(transformComponent, 0, hitboxIdx);
   if (typeof hitbox === "number") {
      throw new Error();
   }
   return getRandomPositionInBox(hitbox.box);
}

export function getRandomPositionOnBoxEdge(box: Box): Point {
   if (boxIsCircular(box)) {
      const offsetMagnitude = box.radius;
      const offsetDirection = randAngle();
      return new Point(box.position.x + offsetMagnitude * Math.sin(offsetDirection), box.position.y + offsetMagnitude * Math.cos(offsetDirection));
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      let xOffset: number;
      let yOffset: number;
      if (Math.random() < 0.5) {
         xOffset = randFloat(-halfWidth, halfWidth);
         yOffset = halfHeight * randSign();
      } else {
         xOffset = halfWidth * randSign();
         yOffset = randFloat(-halfHeight, halfHeight);
      }

      const x = box.position.x + rotateXAroundOrigin(xOffset, yOffset, box.angle);
      const y = box.position.y + rotateYAroundOrigin(xOffset, yOffset, box.angle);
      return new Point(x, y);
   }
}

export function entityIsVisibleToCamera(entity: Entity): boolean {
   if (getEntityLayer(entity) === getCurrentLayer()) {
      return true;
   }

   // If on a different layer, the entity must be below a dropdown tile
   
   const transformComponent = TransformComponentArray.getComponent(entity);

   const minTileX = Math.floor(transformComponent.boundingAreaMinX / Settings.TILE_SIZE);
   const maxTileX = Math.floor(transformComponent.boundingAreaMaxX / Settings.TILE_SIZE);
   const minTileY = Math.floor(transformComponent.boundingAreaMinY / Settings.TILE_SIZE);
   const maxTileY = Math.floor(transformComponent.boundingAreaMaxY / Settings.TILE_SIZE);
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = surfaceLayer.getTileFromCoords(tileX, tileY);
         if (tile.type === TileType.dropdown) {
            return true;
         }
      }
   }

   return false;
}