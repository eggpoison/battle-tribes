import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "./ServerComponent";
import { Point, customTickIntervalHasPassed, lerp, randInt } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { TILE_MOVE_SPEED_MULTIPLIERS, TileType, TILE_FRICTIONS } from "battletribes-shared/tiles";
import Board from "../Board";
import { EntityType } from "battletribes-shared/entities";
import Particle from "../Particle";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { playSound, AudioFilePath } from "../sound";
import Player from "../entities/Player";
import { keyIsPressed } from "../keyboard-input";
import { resolveWallTileCollisions } from "../collision";
import { PacketReader } from "battletribes-shared/packets";
import { createWaterSplashParticle } from "../particles";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { getEntityLayer, getEntityType } from "../world";

const applyPhysics = (physicsComponent: PhysicsComponent): void => {
   if (isNaN(physicsComponent.selfVelocity.x)) {
      throw new Error("Self velocity was NaN.");
   }
   if (isNaN(physicsComponent.externalVelocity.x)) {
      throw new Error("External velocity was NaN.");
   }
   if (!isFinite(physicsComponent.externalVelocity.x)) {
      throw new Error("External velocity is infinite.");
   }

   const transformComponent = physicsComponent.entity.getServerComponent(ServerComponentType.transform);
   const layer = getEntityLayer(physicsComponent.entity.id);
   
   if (isNaN(transformComponent.position.x)) {
      throw new Error("Position was NaN.");
   }
   
   // Apply acceleration (to self-velocity)
   if (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) {
      let tileMoveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[transformComponent.tile.type];
      if (transformComponent.tile.type === TileType.water && !transformComponent.isInRiver()) {
         tileMoveSpeedMultiplier = 1;
      }

      const friction = TILE_FRICTIONS[transformComponent.tile.type];
      
      // Calculate the desired velocity based on acceleration
      const desiredVelocityX = physicsComponent.acceleration.x * friction * tileMoveSpeedMultiplier;
      const desiredVelocityY = physicsComponent.acceleration.y * friction * tileMoveSpeedMultiplier;

      // Apply velocity with traction (blend towards desired velocity)
      physicsComponent.selfVelocity.x += (desiredVelocityX - physicsComponent.selfVelocity.x) * physicsComponent.traction * Settings.I_TPS;
      physicsComponent.selfVelocity.y += (desiredVelocityY - physicsComponent.selfVelocity.y) * physicsComponent.traction * Settings.I_TPS;
   }

   // @Speed: so much polymorphism and function calls and shit
   // Apply river flow to external velocity
   const moveSpeedIsOverridden = typeof physicsComponent.entity.overrideTileMoveSpeedMultiplier !== "undefined" && physicsComponent.entity.overrideTileMoveSpeedMultiplier() !== null;
   if (transformComponent.isInRiver() && !moveSpeedIsOverridden) {
      const flowDirection = layer.getRiverFlowDirection(transformComponent.tile.x, transformComponent.tile.y);
      physicsComponent.selfVelocity.x += 240 / Settings.TPS * Math.sin(flowDirection);
      physicsComponent.selfVelocity.y += 240 / Settings.TPS * Math.cos(flowDirection);
   }

   let shouldUpdate = false;
   
   // Apply friction to self-velocity
   if (physicsComponent.selfVelocity.x !== 0 || physicsComponent.selfVelocity.y !== 0) {
      const friction = TILE_FRICTIONS[transformComponent.tile.type];
      
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
      const friction = TILE_FRICTIONS[transformComponent.tile.type];
      
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
      transformComponent.updatePosition();
      transformComponent.entity.dirty();
   }

   if (isNaN(transformComponent.position.x)) {
      console.log(physicsComponent.selfVelocity.x, physicsComponent.externalVelocity.x);
      throw new Error("Position was NaN.");
   }
}

const resolveBorderCollisions = (physicsComponent: PhysicsComponent): void => {
   const transformComponent = physicsComponent.entity.getServerComponent(ServerComponentType.transform);
   
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

class PhysicsComponent extends ServerComponent {
   // @Memory @Speed: Unbox external velocity and velocity
   
   public readonly selfVelocity = new Point(-1, -1);
   public readonly acceleration = new Point(-1, -1);

   public readonly externalVelocity = new Point(-1, -1);

   public angularVelocity = 0;

   public traction = 0;

   public padData(reader: PacketReader): void {
      reader.padOffset(7 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.selfVelocity.x = reader.readNumber();
      this.selfVelocity.y = reader.readNumber();
      this.externalVelocity.x = reader.readNumber();
      this.externalVelocity.y = reader.readNumber();
      this.acceleration.x = reader.readNumber();
      this.acceleration.y = reader.readNumber();
      this.traction = reader.readNumber();
   }

   public updatePlayerFromData(reader: PacketReader, isInitialData: boolean): void {
      if (isInitialData) {
         this.updateFromData(reader);
      } else {
         this.padData(reader);
      }
   }
}

export default PhysicsComponent;

export const PhysicsComponentArray = new ComponentArray<PhysicsComponent>(ComponentArrayType.server, ServerComponentType.physics, true, {
   onTick: onTick,
   onUpdate: onUpdate
});

function onTick(physicsComponent: PhysicsComponent): void {
   const transformComponent = physicsComponent.entity.getServerComponent(ServerComponentType.transform);

   // Water droplet particles
   // @Cleanup: Don't hardcode fish condition
   if (transformComponent.isInRiver() && customTickIntervalHasPassed(Board.clientTicks, 0.05) && (getEntityType(physicsComponent.entity.id) !== EntityType.fish)) {
      createWaterSplashParticle(transformComponent.position.x, transformComponent.position.y);
   }
   
   // Water splash particles
   // @Cleanup: Move to particles file
   if (transformComponent.isInRiver() && customTickIntervalHasPassed(Board.clientTicks, 0.15) && (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) && getEntityType(physicsComponent.entity.id) !== EntityType.fish) {
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

      playSound(("water-splash-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.25, 1, transformComponent.position);
   }
}

function onUpdate(physicsComponent: PhysicsComponent): void {
   applyPhysics(physicsComponent);
   
   // Don't resolve wall tile collisions in lightspeed mode
   if (Player.instance === null || physicsComponent.entity.id !== Player.instance.id || !keyIsPressed("l")) { 
      resolveWallTileCollisions(physicsComponent.entity);
   }

   resolveBorderCollisions(physicsComponent);
}