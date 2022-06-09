import { generateTerrain, TileType } from "./terrain-generation";
import { getCanvasContext, getCanvasHeight, getCanvasWidth } from "./components/Canvas";
import { updateDevtools } from "./components/Devtools";
import Entity from "./entities/Entity";
import RenderComponent from "./entity-components/RenderComponent";
import TransformComponent from "./entity-components/TransformComponent";
import SETTINGS from "./settings";
import { precomputeTileLocations, TILE_PARTICLES } from "./data/tile-types";
import { Point, Point3, randFloat, randInt } from "./utils";
import Camera from "./Camera";
import Mob from "./entities/mobs/Mob";
import HitboxComponent from "./entity-components/HitboxComponent";
import OPTIONS from "./options";
import Game from "./Game";
import EntitySpawner from "./EntitySpawner";
import Resource from "./entities/resources/Resource";
import Mouse from "./Mouse";
import TribeWorker from "./entities/tribe-members/TribeWorker";
import Particle from "./particles/Particle";
import ParticleSource from "./particles/ParticleSource";

export type Chunk = Array<Entity>;

export type Coordinates = [number, number];

abstract class Board {
   /** The width and height of the board in chunks */
   public static size: number = 16;
   /** The width and height of a chunk in cells */
   public static chunkSize: number = 8;
   /** By default how large the tiles are in pixels */
   public static tileSize: number = 60;

   public static dimensions = this.size * this.chunkSize;

   /** Each chunk contains an array of entities */
   private static chunks: Array<Array<Chunk>>;
   private static tiles: Array<Array<TileType>>;

   private static disappearingFog = new Array<Coordinates>();

   private static changedTiles = new Array<Coordinates>();

   public static particleSources = new Array<ParticleSource>();
   private static particles = new Array<Particle>();
   private static particlesToDestroy = new Array<Particle>();

   public static setup(): void {
      this.tiles = generateTerrain();

      // Initialise the chunks array
      this.chunks = new Array<Array<Chunk>>(this.size);
      for (let x = 0; x < this.size; x++) {
         this.chunks[x] = new Array<Chunk>(this.size);
         for (let y = 0; y < this.size; y++) {
            this.chunks[x][y] = new Array<Entity>();
         }
      }

      precomputeTileLocations();

      // Spawn initial entities
      EntitySpawner.spawnInitialEntities();
   }

   public static getChangedTiles(): Array<Coordinates> {
      return this.changedTiles;
   }

   public static getTile(x: number, y: number): TileType {
      return this.tiles[x][y];
   }

   public static getChunk(x: number, y: number): Chunk | null {
      // Don't return chunks which are out of bounds
      if (x < 0 || x >= this.size || y < 0 || y >= this.size) return null;

      return this.chunks[x][y];
   }

   public static addParticle(particle: Particle): void {
      this.particles.push(particle);
   }

   public static removeParticle(particle: Particle): void {
      this.particlesToDestroy.push(particle);
   }

   public static addParticleSource(particleSource: ParticleSource): void {
      this.particleSources.push(particleSource);
   }

   public static removeParticleSource(particleSource: ParticleSource): void {
      const idx = this.particleSources.indexOf(particleSource);
      // Don't remove particle sources which have already been removed
      if (idx === -1) return;

      this.particleSources.splice(idx, 1);
   }

   public static clearValues(): void {
      this.changedTiles = new Array<Coordinates>();
   }

   /** Tick all entities */
   public static tick(): void {
      EntitySpawner.runSpawnAttempt();

      let entityCount = 0;
      let passiveMobCount = 0;
      let hostileMobCount = 0;
      let resourceCount = 0;

      const selectedEntities = Mouse.getSelectedUnits();
      const visibleSelectedEntities = new Array<TribeWorker>();

      const entitiesToChangeChunk: Array<[Entity, Chunk]> = [];

      const ctx = getCanvasContext();

      this.renderParticleShadows(ctx);

      for (let y = 0; y < this.size; y++) {
         for (let x = 0; x < this.size; x++) {
            // A copy of the chunk array has to be used, as otherwise if an entity
            // dies, an entity will get skipped by the loop.
            const chunk = this.getChunk(x, y)!.slice();

            const chunkIsVisible = Camera.chunkIsVisible(x, y);

            for (const entity of chunk) {
               entityCount++;
               if (entity instanceof Mob) {
                  const behaviour = entity.entityInfo.behaviour;
                  if (behaviour === "hostile" || behaviour === "neutral") {
                     hostileMobCount++;
                  } else {
                     passiveMobCount++;
                  }
               } else if (entity instanceof Resource) {
                  resourceCount++;
               }

               if (chunkIsVisible) {
                  // Render the entity
                  const renderComponent = entity.getComponent(RenderComponent);
                  if (renderComponent !== null) {
                     renderComponent.renderEntity(ctx);

                     // If the entity is selected, add it to an array to render the selection icon later
                     if (entity instanceof TribeWorker && selectedEntities.includes(entity)) {
                        visibleSelectedEntities.push(entity);
                     }
                  }

                  if (OPTIONS.showEntityHitboxes) {
                     // Draw the hitbox
                     const hitboxComponent = entity.getComponent(HitboxComponent);
                     if (hitboxComponent !== null) {
                        hitboxComponent.drawHitbox(ctx);
                     }
                  }
               }

               entity.tickComponents();
               
               const newChunk = entity.getComponent(TransformComponent)!.getChunk()!;
               if (newChunk !== entity.previousChunk && newChunk !== null) {
                  entitiesToChangeChunk.push([entity, newChunk]);
               }
            }
         }
      }

      for (const [entity, newChunk] of entitiesToChangeChunk) {
         entity.previousChunk!.splice(entity.previousChunk!.indexOf(entity), 1);

         newChunk.push(entity);

         entity.previousChunk = newChunk;
      }

      this.tickTiles();

      this.tickParticles();
      this.renderParticles(ctx);

      this.renderCommandTileTargets(ctx);

      // Render the selection icons
      this.renderSelectionIcons(ctx, visibleSelectedEntities);

      this.updateDisappearingFog();
      
      updateDevtools({
         entityCount: entityCount,
         mobCount: hostileMobCount + passiveMobCount,
         resourceCount: resourceCount
      });

      EntitySpawner.setHostileMobCount(hostileMobCount);
      EntitySpawner.setPassiveMobCount(passiveMobCount);
      EntitySpawner.setResourceCount(resourceCount);
   }

   private static tickTiles(): void {
      const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

      const minX = minChunkX * this.chunkSize;
      const maxX = maxChunkX * this.chunkSize;
      const minY = minChunkY * this.chunkSize;
      const maxY = maxChunkY * this.chunkSize;

      for (let tileX = minX; tileX <= maxX; tileX++) {
         for (let tileY = minY; tileY <= maxY; tileY++) {
            const tile = Board.getTile(tileX, tileY);

            // If the tile can produce a particle
            if (TILE_PARTICLES.hasOwnProperty(tile.kind)) {
               // If it passes the chance check
               const tileParticleInfo = TILE_PARTICLES[tile.kind]!;
               if (Math.random() < tileParticleInfo.spawnChance / SETTINGS.tps) {
                  // Amount of particles to spawn
                  const amount = typeof tileParticleInfo.amount !== "undefined" ? (typeof tileParticleInfo.amount === "number" ? tileParticleInfo.amount : randInt(...tileParticleInfo.amount)) : 1;

                  // Get the spawn position
                  const x = randFloat(0, Board.tileSize);
                  const y = randFloat(0, Board.tileSize);
                  const spawnPosition = new Point3(tileX * Board.tileSize + x, tileY * Board.tileSize + y, 0);

                  // Create the particles
                  for (let i = 0; i < amount; i++) {
                     new Particle(spawnPosition, tileParticleInfo.particleInfo);
                  }
               }
            }
         }
      }
   }

   private static tickParticles(): void {
      // Tick existing particles
      for (const particle of this.particles) {
         particle.tick();
      }
      // Remove destroyed particles
      for (const particle of this.particlesToDestroy) {
         this.particles.splice(this.particles.indexOf(particle), 1);
      }
      this.particlesToDestroy = new Array<Particle>();

      // Tick particle sources
      for (const particleSource of this.particleSources) {
         particleSource.tick();
      }
   }

   private static renderParticleShadows(ctx: CanvasRenderingContext2D): void {
      for (const particle of this.particles) {
         if (this.particleIsVisible(particle)) {
            particle.renderShadow(ctx);
         }
      }
   }

   private static renderParticles(ctx: CanvasRenderingContext2D): void {
      for (const particle of this.particles) {
         if (this.particleIsVisible(particle)) {
            particle.render(ctx);
         }
      }
   }

   private static particleIsVisible(particle: Particle): boolean {
      const [minChunkX, maxChunkX, minChunkY, maxChunkY] = Camera.getVisibleChunkBounds();

      const unitsInChunk = this.chunkSize * this.tileSize;

      const minX = minChunkX * unitsInChunk;
      const maxX = maxChunkX * unitsInChunk;
      const minY = minChunkY * unitsInChunk;
      const maxY = maxChunkY * unitsInChunk;

      return particle.position.x >= minX && particle.position.x <= maxX && particle.position.y >= minY && particle.position.y <= maxY;
   }

   private static renderCommandTileTargets(ctx: CanvasRenderingContext2D): void {
      ctx.strokeStyle = Mouse.UNIT_SELECTION_COLOUR;
      ctx.lineWidth = 5;

      for (const [x, y] of Mouse.getCommandTileTargets()) {
         const scaleFactor = (Math.sin(Game.ticks / SETTINGS.tps * 2) + 1) / 2 * Board.tileSize / 3;

         const x1 = Camera.getXPositionInCamera(x * Board.tileSize - scaleFactor);
         const x2 = Camera.getXPositionInCamera((x + 1) * Board.tileSize + scaleFactor);
         const y1 = Camera.getYPositionInCamera(y * Board.tileSize - scaleFactor);
         const y2 = Camera.getYPositionInCamera((y + 1) * Board.tileSize + scaleFactor);

         const middleX = Camera.getXPositionInCamera((x + 0.5) * Board.tileSize);
         const middleY = Camera.getYPositionInCamera((y + 0.5) * Board.tileSize);

         const rotation = (Game.ticks / SETTINGS.tps * 2) % 360;

         // Move the canvas origin to the center of the tile
         ctx.translate(middleX, middleY);
         ctx.rotate(rotation);
         // Undo the translation
         ctx.translate(-middleX, -middleY);

         ctx.beginPath();

         ctx.moveTo(x1, y1);
         ctx.lineTo(x2, y1);
         ctx.lineTo(x2, y2);
         ctx.lineTo(x1, y2);
         ctx.lineTo(x1, y1);

         ctx.stroke();
         
         // Reset rotation
         ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
   }

   private static renderSelectionIcons(ctx: CanvasRenderingContext2D, entities: Array<TribeWorker>): void {
      const WIDTH = 5;
      const SIZE = 90;

      ctx.lineWidth = WIDTH;
      ctx.strokeStyle = Mouse.UNIT_SELECTION_COLOUR;

      for (const entity of entities) {
         const entityPosition = entity.getComponent(TransformComponent)!.position;

         const x1 = Camera.getXPositionInCamera(entityPosition.x - SIZE/2);
         const x2 = Camera.getXPositionInCamera(entityPosition.x + SIZE/2);
         const y1 = Camera.getYPositionInCamera(entityPosition.y - SIZE/2);
         const y2 = Camera.getYPositionInCamera(entityPosition.y + SIZE/2);

         ctx.beginPath();

         ctx.moveTo(x1, y1); // Move to top left
         ctx.lineTo(x2, y1); // Top right
         ctx.lineTo(x2, y2); // Bottom right
         ctx.lineTo(x1, y2); // Bottom left
         ctx.lineTo(x1, y1); // Top left

         ctx.stroke();
      }
   }

   public static drawDarkness(): void {
      let darkness = Game.getSkyDarkness();
      if (darkness === 0) return;

      const ctx = getCanvasContext();

      const width = getCanvasWidth();
      const height = getCanvasHeight();

      darkness *= 0.6;
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
      ctx.fillRect(0, 0, width, height);
   }

   private static readonly fogDiscoverLocations: { [key: number]: Array<Coordinates> } = {};

   private static calculateFogDiscoverLocations(radius: number): Array<Coordinates> {
      const minX = -Math.floor(radius);
      const maxX = Math.ceil(radius);
      const minY = -Math.floor(radius);
      const maxY = Math.ceil(radius);

      const fogDiscoverLocations = new Array<Coordinates>();

      for (let x = minX; x <= maxX; x++) {
         for (let y = minY; y <= maxY; y++) {
            if (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) <= radius) {
               fogDiscoverLocations.push([x, y]);
            }
         }
      }

      return fogDiscoverLocations;
   }

   private static updateDisappearingFog(): void {
      for (let i = this.disappearingFog.length - 1; i >= 0; i--) {
         const [x, y] = this.disappearingFog[i];
         const tile = this.getTile(x, y);

         tile.fogAmount -= 1 / SETTINGS.tps / SETTINGS.fogRevealTime;

         if (tile.fogAmount <= 0) {
            tile.fogAmount = 0;

            this.disappearingFog.splice(i, 1);
         }
      }
   }

   public static revealFog(startCoordinates: Coordinates, radius: number, isImmediate: boolean): void {
      let fogDiscoverLocations: Array<Coordinates>;

      if (this.fogDiscoverLocations.hasOwnProperty(radius)) {
         // If the fog discover locations have already been calculated, return the previously calculated values
         fogDiscoverLocations = this.fogDiscoverLocations[radius];
      } else {
         // Calculate the fog discover locations
         fogDiscoverLocations = this.calculateFogDiscoverLocations(radius);
         this.fogDiscoverLocations[radius] = fogDiscoverLocations;
      }

      const [x, y] = startCoordinates;
      for (const [offsetX, offsetY] of fogDiscoverLocations) {
         if (x + offsetX < 0 || x + offsetX >= Board.dimensions || y + offsetY < 0 || y + offsetY >= Board.dimensions) {
            continue;
         }

         const tile = this.getTile(x + offsetX, y + offsetY);

         // Reveal fog
         if (tile.fogAmount === 1) {
            if (isImmediate) {
               tile.fogAmount = 0;
               this.changedTiles.push([x + offsetX, y + offsetY]);
            } else {
               this.disappearingFog.push([x + offsetX, y + offsetY]);
            }
         }

         // Add the fog to the changed tiles
         this.changedTiles.push([x + offsetX, y + offsetY]);
      }
   }

   private static getEntityChunk(entity: Entity): Chunk {
      // Get the chunk
      const entityPositionComponent = entity.getComponent(TransformComponent)!;
      const chunk = entityPositionComponent.getChunk()!;
      return chunk;
   }

   public static addEntity(entity: Entity): void {
      const chunk = this.getEntityChunk(entity);

      // If the entity's spawn position is outside the board, don't add it
      if (chunk === null) return;

      if (typeof entity.onLoad !== "undefined") entity.onLoad();
      entity.loadComponents();

      // Add the entity to the chunk
      chunk.push(entity);

      // Update the entity's previous chunk
      entity.previousChunk = chunk;
   }

   public static removeEntity(entity: Entity): void {
      // Remove the entity from its chunk
      const chunk = entity.previousChunk!;
      chunk.splice(chunk.indexOf(entity), 1);
   }

   public static getRandomPositionInTile(tileX: number, tileY: number): Point {
      const x = tileX * Board.tileSize + Board.tileSize * Math.random();
      const y = tileY * Board.tileSize + Board.tileSize * Math.random();

      return new Point(x, y);
   }

   public static getNearbyTileCoordinates(position: Point, range: number): Array<Coordinates> {
      if (!Number.isInteger(range)) throw new Error("Search radius must be an integer!");

      const tileX = Math.floor(position.x / this.tileSize);
      const tileY = Math.floor(position.y / this.tileSize);

      const minX = Math.max(tileX - range, 0);
      const maxX = Math.min(tileX + range, this.dimensions - 1);
      const minY = Math.max(tileY - range, 0);
      const maxY = Math.min(tileY + range, this.dimensions - 1);

      const nearbyTileCoordinates = new Array<Coordinates>();
      for (let y = minY; y <= maxY; y++) {
         for (let x = minX; x <= maxX; x++) {
            nearbyTileCoordinates.push([x, y]);
         }
      }

      return nearbyTileCoordinates;
   }

   public static getEntitiesInRange(position: Point, radius: number): Array<Entity> {
      const unitsInChunk = Board.tileSize * Board.chunkSize;

      const minChunkX = Math.max(Math.floor((position.x - radius) / unitsInChunk), 0);
      const maxChunkX = Math.min(Math.floor((position.x + radius) / unitsInChunk), Board.size - 1);
      
      const minChunkY = Math.max(Math.floor((position.y - radius) / unitsInChunk), 0);
      const maxChunkY = Math.min(Math.floor((position.y + radius) / unitsInChunk), Board.size - 1);

      const nearbyEntities = new Array<Entity>();

      for (let y = minChunkY; y <= maxChunkY; y++) {
         for (let x = minChunkX; x <= maxChunkX; x++) {
            const chunk = Board.getChunk(x, y);
            if (chunk === null) continue;
            
            for (const entity of chunk) {
               const hitboxComponent = entity.getComponent(HitboxComponent);
               if (hitboxComponent !== null) {
                  const entityPosition = entity.getComponent(TransformComponent)!.position;

                  const hitboxInfo = hitboxComponent.hitboxInfo;
                  switch (hitboxInfo.type) {
                     case "circle": {
                        if (position.distanceFrom(entityPosition) - hitboxInfo.radius * Board.tileSize <= radius) {
                           nearbyEntities.push(entity);
                        }
                        break;
                     }
                     case "rectangle": {
                        const dist = position.distanceFromRectangle(
                           entityPosition.x - hitboxInfo.width / 2 * Board.tileSize,
                           entityPosition.x + hitboxInfo.width / 2 * Board.tileSize,
                           entityPosition.y - hitboxInfo.height / 2 * Board.tileSize,
                           entityPosition.y + hitboxInfo.height / 2 * Board.tileSize);
                        if (dist <= radius) {
                           nearbyEntities.push(entity);
                        }
                        break;
                     }
                  }
               }
            }
         }
      }

      return nearbyEntities;
   }
}

export default Board;