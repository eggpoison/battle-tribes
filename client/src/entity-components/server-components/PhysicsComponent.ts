import { ServerComponentType } from "battletribes-shared/components";
import { Point, customTickIntervalHasPassed, lerp, randInt } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { TILE_MOVE_SPEED_MULTIPLIERS, TileType, TILE_FRICTIONS } from "battletribes-shared/tiles";
import Board from "../../Board";
import { EntityID, EntityType } from "battletribes-shared/entities";
import Particle from "../../Particle";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { playSound } from "../../sound";
import Player from "../../entities/Player";
import { keyIsPressed } from "../../keyboard-input";
import { resolveWallCollisions } from "../../collision";
import { PacketReader } from "battletribes-shared/packets";
import { createWaterSplashParticle } from "../../particles";
import { getEntityByID, getEntityLayer, getEntityRenderInfo, getEntityType } from "../../world";
import { entityIsInRiver, getEntityTile, TransformComponentArray, updateEntityPosition } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";

const applyPhysics = (physicsComponent: PhysicsComponent, entity: EntityID): void => {
   if (isNaN(physicsComponent.selfVelocity.x)) {
      throw new Error("Self velocity was NaN.");
   }
   if (isNaN(physicsComponent.externalVelocity.x)) {
      throw new Error("External velocity was NaN.");
   }
   if (!isFinite(physicsComponent.externalVelocity.x)) {
      throw new Error("External velocity is infinite.");
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   const layer = getEntityLayer(entity);
   const tile = getEntityTile(layer, transformComponent);
   
   if (isNaN(transformComponent.position.x)) {
      throw new Error("Position was NaN.");
   }
   
   // Apply acceleration (to self-velocity)
   if (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) {
      let tileMoveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[tile.type];
      if (tile.type === TileType.water && !entityIsInRiver(transformComponent, entity)) {
         tileMoveSpeedMultiplier = 1;
      }

      const friction = TILE_FRICTIONS[tile.type];
      
      // Calculate the desired velocity based on acceleration
      const desiredVelocityX = physicsComponent.acceleration.x * friction * tileMoveSpeedMultiplier;
      const desiredVelocityY = physicsComponent.acceleration.y * friction * tileMoveSpeedMultiplier;

      // Apply velocity with traction (blend towards desired velocity)
      physicsComponent.selfVelocity.x += (desiredVelocityX - physicsComponent.selfVelocity.x) * physicsComponent.traction * Settings.I_TPS;
      physicsComponent.selfVelocity.y += (desiredVelocityY - physicsComponent.selfVelocity.y) * physicsComponent.traction * Settings.I_TPS;
   }

   // @Hack
   const entityTemp = getEntityByID(entity)!;

   // @Speed: so much polymorphism and function calls and shit
   // Apply river flow to external velocity
   const moveSpeedIsOverridden = typeof entityTemp.overrideTileMoveSpeedMultiplier !== "undefined" && entityTemp.overrideTileMoveSpeedMultiplier() !== null;
   if (entityIsInRiver(transformComponent, entity) && !moveSpeedIsOverridden) {
      const flowDirection = layer.getRiverFlowDirection(tile.x, tile.y);
      physicsComponent.selfVelocity.x += 240 / Settings.TPS * Math.sin(flowDirection);
      physicsComponent.selfVelocity.y += 240 / Settings.TPS * Math.cos(flowDirection);
   }

   let shouldUpdate = false;
   
   // Apply friction to self-velocity
   if (physicsComponent.selfVelocity.x !== 0 || physicsComponent.selfVelocity.y !== 0) {
      const friction = TILE_FRICTIONS[tile.type];
      
      // Apply air and ground friction to selfVelocity
      physicsComponent.selfVelocity.x *= 1 - friction * Settings.I_TPS * 2;
      physicsComponent.selfVelocity.y *= 1 - friction * Settings.I_TPS * 2;

      const selfVelocityMagnitude = physicsComponent.selfVelocity.length();
      if (selfVelocityMagnitude > 0) {
         const groundFriction = Math.min(friction, selfVelocityMagnitude);
         physicsComponent.selfVelocity.x -= groundFriction * physicsComponent.selfVelocity.x / selfVelocityMagnitude;
         physicsComponent.selfVelocity.y -= groundFriction * physicsComponent.selfVelocity.y / selfVelocityMagnitude;
      }

      shouldUpdate = true;
   }

   // Apply friction to external velocity
   if (physicsComponent.externalVelocity.x !== 0 || physicsComponent.externalVelocity.y !== 0) {
      const friction = TILE_FRICTIONS[tile.type];
      
      // Apply air and ground friction to externalVelocity
      physicsComponent.externalVelocity.x *= 1 - friction * Settings.I_TPS * 2;
      physicsComponent.externalVelocity.y *= 1 - friction * Settings.I_TPS * 2;

      const externalVelocityMagnitude = physicsComponent.externalVelocity.length();
      if (externalVelocityMagnitude > 0) {
         const groundFriction = Math.min(friction, externalVelocityMagnitude);
         physicsComponent.externalVelocity.x -= groundFriction * physicsComponent.externalVelocity.x / externalVelocityMagnitude;
         physicsComponent.externalVelocity.y -= groundFriction * physicsComponent.externalVelocity.y / externalVelocityMagnitude;
      }

      shouldUpdate = true;
   }

   if (shouldUpdate) {
      // Update position based on the sum of self-velocity and external velocity
      transformComponent.position.x += (physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x) * Settings.I_TPS;
      transformComponent.position.y += (physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y) * Settings.I_TPS;

      // Mark entity's position as updated
      updateEntityPosition(transformComponent, entity);
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.dirty();
   }

   if (isNaN(transformComponent.position.x)) {
      console.log(physicsComponent.selfVelocity.x, physicsComponent.externalVelocity.x);
      throw new Error("Position was NaN.");
   }
}

const resolveBorderCollisions = (physicsComponent: PhysicsComponent, entity: EntityID): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;
      
      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();

      // Left wall
      if (minX < 0) {
         transformComponent.position.x -= minX;
         physicsComponent.selfVelocity.x = 0;
         // Right wall
      } else if (maxX > Settings.BOARD_UNITS) {
         transformComponent.position.x -= maxX - Settings.BOARD_UNITS;
         physicsComponent.selfVelocity.x = 0;
      }
      
      // Bottom wall
      if (minY < 0) {
         transformComponent.position.y -= minY;
         physicsComponent.selfVelocity.y = 0;
         // Top wall
      } else if (maxY > Settings.BOARD_UNITS) {
         transformComponent.position.y -= maxY - Settings.BOARD_UNITS;
         physicsComponent.selfVelocity.y = 0;
      }
   }
}

class PhysicsComponent {
   // @Memory @Speed: Unbox external velocity and velocity
   
   public readonly selfVelocity = new Point(-1, -1);
   public readonly acceleration = new Point(-1, -1);

   public readonly externalVelocity = new Point(-1, -1);

   public angularVelocity = 0;

   public traction = 0;
}

export default PhysicsComponent;

export const PhysicsComponentArray = new ServerComponentArray<PhysicsComponent>(ServerComponentType.physics, true, {
   onTick: onTick,
   onUpdate: onUpdate,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

function onTick(physicsComponent: PhysicsComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Water droplet particles
   // @Cleanup: Don't hardcode fish condition
   if (entityIsInRiver(transformComponent, entity) && customTickIntervalHasPassed(Board.clientTicks, 0.05) && (getEntityType(entity) !== EntityType.fish)) {
      createWaterSplashParticle(transformComponent.position.x, transformComponent.position.y);
   }
   
   // Water splash particles
   // @Cleanup: Move to particles file
   if (entityIsInRiver(transformComponent, entity) && customTickIntervalHasPassed(Board.clientTicks, 0.15) && (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) && getEntityType(entity) !== EntityType.fish) {
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
         transformComponent.position.x, transformComponent.position.y,
         0, 0,
         0, 0,
         0,
         2 * Math.PI * Math.random(),
         0,
         0,
         0,
         8 * 1 + 5,
         0, 0, 0
      );
      Board.lowTexturedParticles.push(particle);

      playSound("water-splash-" + randInt(1, 3) + ".mp3", 0.25, 1, transformComponent.position);
   }
}

function onUpdate(entity: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   
   applyPhysics(physicsComponent, entity);
   
   // Don't resolve wall tile collisions in lightspeed mode
   if (Player.instance === null || entity !== Player.instance.id || !keyIsPressed("l")) { 
      resolveWallCollisions(entity);
   }

   resolveBorderCollisions(physicsComponent, entity);
}

function padData(reader: PacketReader): void {
   reader.padOffset(7 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   physicsComponent.selfVelocity.x = reader.readNumber();
   physicsComponent.selfVelocity.y = reader.readNumber();
   physicsComponent.externalVelocity.x = reader.readNumber();
   physicsComponent.externalVelocity.y = reader.readNumber();
   physicsComponent.acceleration.x = reader.readNumber();
   physicsComponent.acceleration.y = reader.readNumber();
   physicsComponent.traction = reader.readNumber();
}

function updatePlayerFromData(reader: PacketReader, isInitialData: boolean): void {
   if (isInitialData) {
      updateFromData(reader, Player.instance!.id);
   } else {
      padData(reader);
   }
}