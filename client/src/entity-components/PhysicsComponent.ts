import { PhysicsComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { Point, lerp, randInt } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import { TILE_MOVE_SPEED_MULTIPLIERS, TileType, TILE_FRICTIONS } from "webgl-test-shared/dist/tiles";
import Board from "../Board";
import { EntityType } from "webgl-test-shared/dist/entities";
import Particle from "../Particle";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { playSound, AudioFilePath } from "../sound";
import Player from "../entities/Player";
import { keyIsPressed } from "../keyboard-input";
import { collide, resolveWallTileCollisions } from "../collision";
import TransformComponent from "./TransformComponent";
import { COLLISION_BITS } from "webgl-test-shared/dist/collision";
import { latencyGameState } from "../game-state/game-states";

const applyPhysics = (physicsComponent: PhysicsComponent): void => {
   const transformComponent = physicsComponent.entity.getServerComponent(ServerComponentType.transform);
   
   // Apply acceleration
   if (physicsComponent.acceleration.x !== 0 || physicsComponent.acceleration.y !== 0) {
      let tileMoveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[transformComponent.tile.type];
      if (transformComponent.tile.type === TileType.water && !transformComponent.isInRiver()) {
         tileMoveSpeedMultiplier = 1;
      }

      const friction = TILE_FRICTIONS[transformComponent.tile.type];
      
      physicsComponent.velocity.x += physicsComponent.acceleration.x * friction * tileMoveSpeedMultiplier * Settings.I_TPS;
      physicsComponent.velocity.y += physicsComponent.acceleration.y * friction * tileMoveSpeedMultiplier * Settings.I_TPS;
   }

   // If the game object is in a river, push them in the flow direction of the river
   const moveSpeedIsOverridden = typeof physicsComponent.entity.overrideTileMoveSpeedMultiplier !== "undefined" && physicsComponent.entity.overrideTileMoveSpeedMultiplier() !== null;
   if (transformComponent.isInRiver() && !moveSpeedIsOverridden) {
      const flowDirection = Board.getRiverFlowDirection(transformComponent.tile.x, transformComponent.tile.y);
      physicsComponent.velocity.x += 240 / Settings.TPS * Math.sin(flowDirection);
      physicsComponent.velocity.y += 240 / Settings.TPS * Math.cos(flowDirection);
   }

   // Apply velocity
   if (physicsComponent.velocity.x !== 0 || physicsComponent.velocity.y !== 0) {
      const friction = TILE_FRICTIONS[transformComponent.tile.type];

      // Apply a friction based on the tile type to simulate air resistance (???)
      physicsComponent.velocity.x *= 1 - friction * Settings.I_TPS * 2;
      physicsComponent.velocity.y *= 1 - friction * Settings.I_TPS * 2;

      // Apply a constant friction based on the tile type to simulate ground friction
      const velocityMagnitude = physicsComponent.velocity.length();
      if (velocityMagnitude > 0) {
         const groundFriction = Math.min(friction, velocityMagnitude);
         physicsComponent.velocity.x -= groundFriction * physicsComponent.velocity.x / velocityMagnitude;
         physicsComponent.velocity.y -= groundFriction * physicsComponent.velocity.y / velocityMagnitude;
      }
      
      transformComponent.position.x += physicsComponent.velocity.x * Settings.I_TPS;
      transformComponent.position.y += physicsComponent.velocity.y * Settings.I_TPS;

      transformComponent.entity.dirty();
   }

   if (isNaN(transformComponent.position.x)) {
      throw new Error("Position was NaN.");
   }
}

const resolveBorderCollisions = (physicsComponent: PhysicsComponent): void => {
   const transformComponent = physicsComponent.entity.getServerComponent(ServerComponentType.transform);
   
   for (const hitbox of transformComponent.hitboxes) {
      const minX = hitbox.calculateHitboxBoundsMinX();
      const maxX = hitbox.calculateHitboxBoundsMaxX();
      const minY = hitbox.calculateHitboxBoundsMinY();
      const maxY = hitbox.calculateHitboxBoundsMaxY();

      // Left wall
      if (minX < 0) {
         transformComponent.position.x -= minX;
         physicsComponent.velocity.x = 0;
         // Right wall
      } else if (maxX > Settings.BOARD_UNITS) {
         transformComponent.position.x -= maxX - Settings.BOARD_UNITS;
         physicsComponent.velocity.x = 0;
      }
      
      // Bottom wall
      if (minY < 0) {
         transformComponent.position.y -= minY;
         physicsComponent.velocity.y = 0;
         // Top wall
      } else if (maxY > Settings.BOARD_UNITS) {
         transformComponent.position.y -= maxY - Settings.BOARD_UNITS;
         physicsComponent.velocity.y = 0;
      }
   }
}


const getPotentialCollidingEntities = (transformComponent: TransformComponent): ReadonlyArray<Entity> => {
   const entities = new Array<Entity>();

   for (const chunk of transformComponent.chunks) {
      for (const entityID of chunk.entities) {
         if (entityID !== transformComponent.entity.id) {
            const entity = Board.entityRecord[entityID]!;
            entities.push(entity);
         }
      }
   }

   return entities;
}
const resolveGameObjectCollisions = (physicsComponent: PhysicsComponent): void => {
   const transformComponent = physicsComponent.entity.getServerComponent(ServerComponentType.transform);
   
   const potentialCollidingEntities = getPotentialCollidingEntities(transformComponent);

   transformComponent.collidingEntities = [];

   for (let i = 0; i < potentialCollidingEntities.length; i++) {
      const entity = potentialCollidingEntities[i];

      const entityTransformComponent = entity.getServerComponent(ServerComponentType.transform);
      
      // If the two entities are exactly on top of each other, don't do anything
      if (entityTransformComponent.position.x === transformComponent.position.x && entityTransformComponent.position.y === transformComponent.position.y) {
         continue;
      }

      for (const hitbox of transformComponent.hitboxes) {
         for (const otherHitbox of entityTransformComponent.hitboxes) {
            if (hitbox.isColliding(otherHitbox)) {
               if (!transformComponent.collidingEntities.includes(entity)) {
                  transformComponent.collidingEntities.push(entity);
               }
               
               if ((entityTransformComponent.collisionMask & transformComponent.collisionBit) !== 0 && (transformComponent.collisionMask & entityTransformComponent.collisionBit) !== 0) {
                  collide(physicsComponent.entity, entity, hitbox, otherHitbox);
               } else {
                  // @Hack
                  if (entityTransformComponent.collisionBit === COLLISION_BITS.plants) {
                     latencyGameState.lastPlantCollisionTicks = Board.ticks;
                  }
                  break;
               }
            }
         }
      }
   }
}

class PhysicsComponent extends ServerComponent<ServerComponentType.physics> {
   public readonly velocity: Point;
   public readonly acceleration: Point;
   
   constructor(entity: Entity, data: PhysicsComponentData) {
      super(entity);

      this.velocity = new Point(data.velocity[0], data.velocity[1]);
      this.acceleration = new Point(data.acceleration[0], data.acceleration[1]);
   }

   public tick(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      
      // Water splash particles
      // @Cleanup: Move to particles file
      if (transformComponent.isInRiver() && Board.tickIntervalHasPassed(0.15) && (this.acceleration.x !== 0 || this.acceleration.y !== 0) && this.entity.type !== EntityType.fish) {
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

   public update(): void {
      applyPhysics(this);
      
      // Don't resolve wall tile collisions in lightspeed mode
      if (Player.instance === null || this.entity.id !== Player.instance.id || !keyIsPressed("l")) { 
         resolveWallTileCollisions(this.entity);
      }

      resolveGameObjectCollisions(this);
      resolveBorderCollisions(this);
   }

   public updateFromData(data: PhysicsComponentData): void {
      this.velocity.x = data.velocity[0];
      this.velocity.y = data.velocity[1];
      this.acceleration.x = data.acceleration[0];
      this.acceleration.y = data.acceleration[1];
   }
}

export default PhysicsComponent;