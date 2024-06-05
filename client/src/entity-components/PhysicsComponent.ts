import { PhysicsComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { Point, lerp, randInt } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import { TILE_MOVE_SPEED_MULTIPLIERS, TileType, TILE_FRICTIONS } from "webgl-test-shared/dist/tiles";
import Board from "../Board";
import { EntityType } from "webgl-test-shared/dist/entities";
import Particle from "../Particle";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../rendering/particle-rendering";
import { playSound, AudioFilePath } from "../sound";

class PhysicsComponent extends ServerComponent<ServerComponentType.physics> {
   public readonly velocity: Point;
   public readonly acceleration: Point;
   
   constructor(entity: Entity, data: PhysicsComponentData) {
      super(entity);

      this.velocity = new Point(data.velocity[0], data.velocity[1]);
      this.acceleration = new Point(data.acceleration[0], data.acceleration[1]);
   }

   public tick(): void {
      // Water splash particles
      // @Cleanup: Move to particles file
      if (this.entity.isInRiver() && Board.tickIntervalHasPassed(0.15) && (this.acceleration.x !== 0 || this.acceleration.y !== 0) && this.entity.type !== EntityType.fish) {
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
            this.entity.position.x, this.entity.position.y,
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

         playSound(("water-splash-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.25, 1, this.entity.position.x, this.entity.position.y);
      }
   }

   public update(): void {
      // 
      // Apply physics
      // 
      
      // Apply acceleration
      if (this.acceleration.x !== 0 || this.acceleration.y !== 0) {
         let tileMoveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[this.entity.tile.type];
         if (this.entity.tile.type === TileType.water && !this.entity.isInRiver()) {
            tileMoveSpeedMultiplier = 1;
         }

         const friction = TILE_FRICTIONS[this.entity.tile.type];
         
         this.velocity.x += this.acceleration.x * friction * tileMoveSpeedMultiplier * Settings.I_TPS;
         this.velocity.y += this.acceleration.y * friction * tileMoveSpeedMultiplier * Settings.I_TPS;
      }

      // If the game object is in a river, push them in the flow direction of the river
      const moveSpeedIsOverridden = typeof this.entity.overrideTileMoveSpeedMultiplier !== "undefined" && this.entity.overrideTileMoveSpeedMultiplier() !== null;
      if (this.entity.isInRiver() && !moveSpeedIsOverridden) {
         const flowDirection = Board.getRiverFlowDirection(this.entity.tile.x, this.entity.tile.y);
         this.velocity.x += 240 / Settings.TPS * Math.sin(flowDirection);
         this.velocity.y += 240 / Settings.TPS * Math.cos(flowDirection);
      }

      // Apply velocity
      if (this.velocity.x !== 0 || this.velocity.y !== 0) {
         const friction = TILE_FRICTIONS[this.entity.tile.type];

         // Apply a friction based on the tile type to simulate air resistance (???)
         this.velocity.x *= 1 - friction * Settings.I_TPS * 2;
         this.velocity.y *= 1 - friction * Settings.I_TPS * 2;

         // Apply a constant friction based on the tile type to simulate ground friction
         const velocityMagnitude = this.velocity.length();
         if (velocityMagnitude > 0) {
            const groundFriction = Math.min(friction, velocityMagnitude);
            this.velocity.x -= groundFriction * this.velocity.x / velocityMagnitude;
            this.velocity.y -= groundFriction * this.velocity.y / velocityMagnitude;
         }
         
         this.entity.position.x += this.velocity.x * Settings.I_TPS;
         this.entity.position.y += this.velocity.y * Settings.I_TPS;
      }

      if (isNaN(this.entity.position.x)) {
         throw new Error("Position was NaN.");
      }
   }

   public updateFromData(data: PhysicsComponentData): void {
      this.velocity.x = data.velocity[0];
      this.velocity.y = data.velocity[1];
      this.acceleration.x = data.acceleration[0];
      this.acceleration.y = data.acceleration[1];
   }
}

export default PhysicsComponent;