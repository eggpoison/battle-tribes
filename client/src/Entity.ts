import { Point, distance, randFloat, randInt, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import { EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import { EntityData, HitData, HitFlags, HitboxCollisionType, RIVER_STEPPING_STONE_SIZES } from "webgl-test-shared/dist/client-server-types";
import { ComponentData, ServerComponentType, ServerComponentTypeString } from "webgl-test-shared/dist/components";
import RenderPart, { RenderObject } from "./render-parts/RenderPart";
import Chunk from "./Chunk";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import { Tile } from "./Tile";
import CircularHitbox from "./hitboxes/CircularHitbox";
import Board from "./Board";
import { createHealingParticle, createSlimePoolParticle, createSparkParticle, createWaterSplashParticle } from "./particles";
import { playSound } from "./sound";
import ServerComponent from "./entity-components/ServerComponent";
import { ClientComponentClass, ClientComponentType, ClientComponents, ServerComponentClass, createComponent } from "./entity-components/components";
import Component from "./entity-components/Component";
import { removeLightsAttachedToEntity, removeLightsAttachedToRenderPart } from "./lights";
import { EntityEvent } from "webgl-test-shared/dist/entity-events";
import { Hitbox, hitboxIsCircular } from "./hitboxes/hitboxes";

export interface RenderPartOverlayGroup {
   readonly textureSource: string;
   readonly renderParts: Array<RenderPart>;
}

// Use prime numbers / 100 to ensure a decent distribution of different types of particles
const HEALING_PARTICLE_AMOUNTS = [0.05, 0.37, 1.01];

export function createRenderPartOverlayGroup(textureSource: string, renderParts: Array<RenderPart>): RenderPartOverlayGroup {
   return {
      textureSource: textureSource,
      renderParts: renderParts
   };
}

// @Cleanup: copy and paste from server
export function getRandomPointInEntity(entity: Entity): Point {
   const hitbox = entity.hitboxes[randInt(0, entity.hitboxes.length - 1)];

   if (hitboxIsCircular(hitbox)) {
      const offsetMagnitude = hitbox.radius * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      return new Point(entity.position.x + offsetMagnitude * Math.sin(offsetDirection), entity.position.y + offsetMagnitude * Math.cos(offsetDirection));
   } else {
      const halfWidth = hitbox.width / 2;
      const halfHeight = hitbox.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      const hitboxRotation = hitbox.rotation;
      const x = entity.position.x + rotateXAroundOrigin(xOffset, yOffset, entity.rotation + hitboxRotation);
      const y = entity.position.y + rotateYAroundOrigin(xOffset, yOffset, entity.rotation + hitboxRotation);
      return new Point(x, y);
   }
}

export type ComponentDataRecord = Partial<{
   [T in ServerComponentType]: ComponentData<T>;
}>;

type ServerComponentsType = Partial<{
   [T in ServerComponentType]: ServerComponentClass<T>;
}>;
type ClientComponentsType = Partial<{
   [T in keyof typeof ClientComponents]: ClientComponentClass<T>;
}>;

abstract class Entity<T extends EntityType = EntityType> extends RenderObject {
   public readonly id: number;

   public readonly type: EntityType;

   public position: Point;

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation = 0;

   public ageTicks: number;

   public tile!: Tile;

   /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
   public readonly allRenderParts = new Array<RenderPart>();

   public hitboxes = new Array<Hitbox>();
   public readonly hitboxHalfDiagonalLength?: number;
   
   public chunks = new Set<Chunk>();

   // @Cleanup: initialise the value in the constructor
   /** Visual depth of the game object while being rendered */
   public renderDepth = 0;

   /** Amount the game object's render parts will shake */
   public shakeAmount = 0;

   public collisionBit = 0;
   public collisionMask = 0;

   public collidingEntities = new Array<Entity>();

   private readonly serverComponents: ServerComponentsType = {};
   private readonly clientComponents: ClientComponentsType = {};
   private readonly tickableComponents = new Array<Component>();
   private readonly updateableComponents = new Array<Component>();

   public readonly renderPartOverlayGroups = new Array<RenderPartOverlayGroup>();

   constructor(position: Point, id: number, entityType: T, ageTicks: number) {
      super();
      
      this.position = position;
      this.renderPosition.x = position.x;
      this.renderPosition.y = position.y;
      this.id = id;
      this.type = entityType;
      this.ageTicks = ageTicks;

      this.updateCurrentTile();

      // Note: The chunks are calculated outside of the constructor immediately after the game object is created
      // so that all constructors have time to run
   }

   public createComponents(componentsData: ReadonlyArray<ComponentData>): void {
      for (let i = 0; i < componentsData.length; i++) {
         const componentData = componentsData[i];

         const component = createComponent(this, componentData);
         this.addServerComponent(componentData.componentType, component);
      }
   }

   public getRenderPart(tag: string): RenderPart {
      for (let i = 0; i < this.allRenderParts.length; i++) {
         const renderPart = this.allRenderParts[i];

         if (renderPart.tags.includes(tag)) {
            return renderPart;
         }
      }

      throw new Error("No render part with tag '" + tag + "' could be found on entity type " + EntityTypeString[this.type]);
   }

   public getRenderParts(tag: string, expectedAmount?: number): Array<RenderPart> {
      const renderParts = new Array<RenderPart>();
      for (let i = 0; i < this.allRenderParts.length; i++) {
         const renderPart = this.allRenderParts[i];

         if (renderPart.tags.includes(tag)) {
            renderParts.push(renderPart);
         }
      }

      if (typeof expectedAmount !== "undefined" && renderParts.length !== expectedAmount) {
         throw new Error("Expected " + expectedAmount + " render parts with tag '" + tag + "' on " + EntityTypeString[this.type] + " but got " + renderParts.length);
      }
      
      return renderParts;
   }

   public callOnLoadFunctions(): void {
      // @Speed
      const serverComponents = Object.values(this.serverComponents);
      for (let i = 0; i < serverComponents.length; i++) {
         const component = serverComponents[i];
         if (typeof component.onLoad !== "undefined") {
            component.onLoad();
         }
      }

      // @Cleanup: copy and paste
      const clientComponents = Object.values(this.clientComponents);
      for (let i = 0; i < clientComponents.length; i++) {
         const component = clientComponents[i];
         if (typeof component.onLoad !== "undefined") {
            component.onLoad();
         }
      }
   }

   protected addServerComponent<T extends ServerComponentType>(componentType: T, component: ServerComponentClass<T>): void {
      // @Cleanup: Remove cast
      this.serverComponents[componentType] = component as any;

      if (typeof component.tick !== "undefined") {
         this.tickableComponents.push(component);
      }
      if (typeof component.update !== "undefined") {
         this.updateableComponents.push(component);
      }
   }

   protected addClientComponent<T extends ClientComponentType>(componentType: T, component: ClientComponentClass<T>): void {
      // @Cleanup: Remove cast
      this.clientComponents[componentType] = component as any;
      if (typeof component.tick !== "undefined") {
         this.tickableComponents.push(component);
      }
      if (typeof component.update !== "undefined") {
         this.updateableComponents.push(component);
      }
   }

   public getServerComponent<T extends ServerComponentType>(componentType: T): ServerComponentClass<T> {
      const component = this.serverComponents[componentType];

      if (typeof component === "undefined") {
         throw new Error("Entity type '" + EntityTypeString[this.type] + "' does not have component of type '" + ServerComponentTypeString[componentType] + "'");
      }
      
      // @Cleanup: why is exclamation mark required?
      return component!;
   }

   public getClientComponent<T extends ClientComponentType>(componentType: T): ClientComponentClass<T> {
      return this.clientComponents[componentType]!;
   }

   public hasServerComponent(componentType: ServerComponentType): boolean {
      return this.serverComponents.hasOwnProperty(componentType);
   }
   
   public attachRenderPart(renderPart: RenderPart): void {
      // Don't add if already attached
      if (this.allRenderParts.indexOf(renderPart) !== -1) {
         return;
      }

      // Add to the root array
      let idx = this.allRenderParts.length;
      for (let i = 0; i < this.allRenderParts.length; i++) {
         const currentRenderPart = this.allRenderParts[i];
         if (renderPart.zIndex < currentRenderPart.zIndex) {
            idx = i;
            break;
         }
      }
      this.allRenderParts.splice(idx, 0, renderPart);

      renderPart.parent.children.push(renderPart);
      
      Board.numVisibleRenderParts++;
      Board.renderPartRecord[renderPart.id] = renderPart;
   }

   public removeRenderPart(renderPart: RenderPart): void {
      // Don't remove if already removed
      const idx = this.allRenderParts.indexOf(renderPart);
      if (idx === -1) {
         console.warn("Tried to remove when already removed!");
         return;
      }
      
      removeLightsAttachedToRenderPart(renderPart.id);

      Board.numVisibleRenderParts--;
      delete Board.renderPartRecord[renderPart.id];
      
      // Remove from the root array
      this.allRenderParts.splice(this.allRenderParts.indexOf(renderPart), 1);
   }

   public addCircularHitbox(hitbox: CircularHitbox): void {
      this.hitboxes.push(hitbox);
      hitbox.updateFromEntity(this);
      hitbox.updateHitboxBounds();
   }

   public addRectangularHitbox(hitbox: RectangularHitbox): void {
      this.hitboxes.push(hitbox);
      hitbox.updateFromEntity(this);
      hitbox.updateHitboxBounds(this.rotation);
   }

   public remove(): void {
      if (typeof this.onRemove !== "undefined") {
         this.onRemove();
      }

      // @Cleanup: Components shouldn't have this function, should just be on the entity (maybe??)
      for (const component of Object.values(this.serverComponents) as ReadonlyArray<ServerComponent>) {
         if (typeof component.onRemove !== "undefined") {
            component.onRemove();
         }
      }
      for (const component of Object.values(this.clientComponents) as ReadonlyArray<Component>) {
         if (typeof component.onRemove !== "undefined") {
            component.onRemove();
         }
      }

      // Remove any attached lights
      removeLightsAttachedToEntity(this.id);
      for (let i = 0; i < this.allRenderParts.length; i++) {
         const renderPart = this.allRenderParts[i];
         removeLightsAttachedToRenderPart(renderPart.id);
      }
   }

   protected onRemove?(): void;

   public overrideTileMoveSpeedMultiplier?(): number | null;

   public tick(): void {
      this.tintR = 0;
      this.tintG = 0;
      this.tintB = 0;
      
      // Water droplet particles
      // @Cleanup: Don't hardcode fish condition
      if (this.isInRiver() && Board.tickIntervalHasPassed(0.05) && (this.type !== EntityType.fish)) {
         createWaterSplashParticle(this.position.x, this.position.y);
      }

      for (let i = 0; i < this.tickableComponents.length; i++) {
         const component = this.tickableComponents[i];
         component.tick!();
      }

      for (let i = 0; i < this.allRenderParts.length; i++) {
         const renderPart = this.allRenderParts[i];
         renderPart.age++;
      }
   };

   public update(): void {
      this.ageTicks++;
      
      this.resolveBorderCollisions();
      this.updateCurrentTile();
      this.updateHitboxes();
      this.updateContainingChunks();

      for (let i = 0; i < this.updateableComponents.length; i++) {
         const component = this.updateableComponents[i];
         component.update!();
      }
   }

   public isInRiver(): boolean {
      if (this.tile.type !== TileType.water) {
         return false;
      }

      // If the game object is standing on a stepping stone they aren't in a river
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const dist = distance(this.position.x, this.position.y, steppingStone.positionX, steppingStone.positionY);
            if (dist <= size/2) {
               return false;
            }
         }
      }

      return true;
   }

   // @Cleanup: Should this be protected?
   protected resolveBorderCollisions(): void {
      if (this.position.x < 0) {
         this.position.x = 0;
      } else if (this.position.x >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE) {
         this.position.x = Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1;
      }
      if (this.position.y < 0) {
         this.position.y = 0;
      } else if (this.position.y >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE) {
         this.position.y = Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1;
      }
   }

   private updateCurrentTile(): void {
      const tileX = Math.floor(this.position.x / Settings.TILE_SIZE);
      const tileY = Math.floor(this.position.y / Settings.TILE_SIZE);

      if (tileX < 0 || tileX >= Settings.TILES_IN_WORLD_WIDTH || tileY < 0 || tileY >= Settings.TILES_IN_WORLD_WIDTH) {
         throw new Error();
      }
      
      this.tile = Board.getTile(tileX, tileY);
   }

   /** Recalculates which chunks the game object is contained in */
   private updateContainingChunks(): void {
      const containingChunks = new Set<Chunk>();
      
      // Find containing chunks
      for (const hitbox of this.hitboxes) {
         const minChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[0] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[1] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[2] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[3] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = Board.getChunk(chunkX, chunkY);
               containingChunks.add(chunk);
            }
         }
      }

      // Find all chunks which aren't present in the new chunks and remove them
      for (const chunk of this.chunks) {
         if (!containingChunks.has(chunk)) {
            chunk.removeEntity(this);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addEntity(this);
            this.chunks.add(chunk);
         }
      }
   }

   public updateRenderPosition(frameProgress: number): void {
      this.renderPosition.x = this.position.x;
      this.renderPosition.y = this.position.y;

      if (this.hasServerComponent(ServerComponentType.physics)) {
         const physicsComponent = this.getServerComponent(ServerComponentType.physics);
         
         this.renderPosition.x += physicsComponent.velocity.x * frameProgress / Settings.TPS;
         this.renderPosition.y += physicsComponent.velocity.y * frameProgress / Settings.TPS;
      }

      // Shake
      if (this.shakeAmount > 0) {
         const direction = 2 * Math.PI * Math.random();
         this.renderPosition.x += this.shakeAmount * Math.sin(direction);
         this.renderPosition.y += this.shakeAmount * Math.cos(direction);
      }
   }

   private updateHitboxes(): void {
      for (const hitbox of this.hitboxes) {
         hitbox.updateFromEntity(this);
         hitbox.updateHitboxBounds(this.rotation);
      }
   }

   public updateFromData(data: EntityData): void {
      this.position.x = data.position[0];
      this.position.y = data.position[1];

      this.updateCurrentTile();

      this.rotation = data.rotation;
      this.ageTicks = data.ageTicks;

      for (let i = 0; i < data.tickEvents.length; i++) {
         const event = data.tickEvents[i];

         switch (event) {
            case EntityEvent.cowFart: {
               playSound("fart.mp3", 0.3, randFloat(0.9, 1.2), this.position.x, this.position.y);
               break;
            }
         }
      }

      // 
      // Update hitboxes
      // 

      // Remove hitboxes which are no longer exist
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];

         // @Speed
         let localIDExists = false;
         for (let j = 0; j < data.circularHitboxes.length; j++) {
            const hitboxData = data.circularHitboxes[j];
            if (hitboxData.localID === hitbox.localID) {
               localIDExists = true;
               break;
            }
         }
         for (let j = 0; j < data.rectangularHitboxes.length; j++) {
            const hitboxData = data.rectangularHitboxes[j];
            if (hitboxData.localID === hitbox.localID) {
               localIDExists = true;
               break;
            }
         }

         if (!localIDExists) {
            this.hitboxes.splice(i, 1);
            i--;
         }
      }

      for (let i = 0; i < data.circularHitboxes.length; i++) {
         const hitboxData = data.circularHitboxes[i];

         // @Speed
         let existingHitboxIdx = 99999;
         for (let j = 0; j < this.hitboxes.length; j++) {
            const hitbox = this.hitboxes[j];
            if (!hitbox.hasOwnProperty("radius")) {
               continue;
            }
            
            if (hitbox.localID === hitboxData.localID) {
               existingHitboxIdx = j;
               break;
            }
         }
         
         let hitbox: CircularHitbox;
         if (existingHitboxIdx !== 99999) {
            // Update the existing hitbox
            hitbox = this.hitboxes[existingHitboxIdx] as CircularHitbox;
            hitbox.radius = hitboxData.radius;
            hitbox.offset.x = hitboxData.offsetX;
            hitbox.offset.y = hitboxData.offsetY;
            hitbox.collisionType = hitboxData.collisionType as unknown as HitboxCollisionType;
            hitbox.updateFromEntity(this);
            hitbox.updateHitboxBounds();
         } else {
            // Create new hitbox
            hitbox = new CircularHitbox(hitboxData.mass, hitboxData.offsetX, hitboxData.offsetY, hitboxData.collisionType as unknown as HitboxCollisionType, hitboxData.localID, hitboxData.radius);
            this.addCircularHitbox(hitbox);
         }
      }
      for (let i = 0; i < data.rectangularHitboxes.length; i++) {
         const hitboxData = data.rectangularHitboxes[i];

         // @Speed
         let existingHitboxIdx = 99999;
         for (let j = 0; j < this.hitboxes.length; j++) {
            const hitbox = this.hitboxes[j];
            if (hitbox.hasOwnProperty("radius")) {
               continue;
            }
            
            if (hitbox.localID === hitboxData.localID) {
               existingHitboxIdx = j;
               break;
            }
         }
         
         let hitbox: RectangularHitbox;
         if (existingHitboxIdx !== 99999) {
            // Update the existing hitbox
            hitbox = this.hitboxes[existingHitboxIdx] as RectangularHitbox;
            hitbox.width = hitboxData.width;
            hitbox.height = hitboxData.height;
            hitbox.rotation = hitboxData.rotation;
            hitbox.offset.x = hitboxData.offsetX;
            hitbox.offset.y = hitboxData.offsetY;
            hitbox.collisionType = hitboxData.collisionType;
            hitbox.updateFromEntity(this);
            hitbox.updateHitboxBounds(this.rotation);
         } else {
            // Create new hitbox
            hitbox = new RectangularHitbox(hitboxData.mass, hitboxData.offsetX, hitboxData.offsetY, hitboxData.collisionType as unknown as HitboxCollisionType, hitboxData.localID, hitboxData.width, hitboxData.height, hitboxData.rotation);
            this.addRectangularHitbox(hitbox);
         }
      }

      // Update containing chunks

      // @Speed
      // @Speed
      // @Speed

      const containingChunks = new Set<Chunk>();

      for (const hitbox of this.hitboxes) {
         // Recalculate the game object's containing chunks based on the new hitbox bounds
         const minChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[0] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[1] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[2] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[3] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = Board.getChunk(chunkX, chunkY);
               containingChunks.add(chunk);
            }
         }
      }

      // Find all chunks which aren't present in the new chunks and remove them
      for (const chunk of this.chunks) {
         if (!containingChunks.has(chunk)) {
            chunk.removeEntity(this);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addEntity(this);
            this.chunks.add(chunk);
         }
      }

      // Update components from data
      for (let i = 0; i < data.components.length; i++) {
         const componentData = data.components[i];
         const component = this.getServerComponent(componentData.componentType);

         // @Cleanup: nasty cast
         component.updateFromData(componentData as any);
      }
   }

   public die(): void {
      if (typeof this.onDie !== "undefined") {
         this.onDie();
      }

      // @Cleanup: component shouldn't be typed as any!!
      for (const component of Object.values(this.serverComponents)) {
         if (typeof component.onDie !== "undefined") {
            component.onDie();
         }
      }
      for (const component of Object.values(this.clientComponents)) {
         if (typeof component.onDie !== "undefined") {
            component.onDie();
         }
      }
   }

   protected onDie?(): void;

   protected onHit?(hitData: HitData): void;

   public registerHit(hitData: HitData): void {
      // If the entity is hit by a flesh sword, create slime puddles
      if (hitData.flags & HitFlags.HIT_BY_FLESH_SWORD) {
         for (let i = 0; i < 2; i++) {
            createSlimePoolParticle(this.position.x, this.position.y, 32);
         }
      }

      // @Incomplete
      if (hitData.flags & HitFlags.HIT_BY_SPIKES) {
         playSound("spike-stab.mp3", 0.3, 1, hitData.hitPosition[0], hitData.hitPosition[1]);
      }
      
      if (typeof this.onHit !== "undefined") {
         this.onHit(hitData);
      }

      const isDamagingHit = (hitData.flags & HitFlags.NON_DAMAGING_HIT) === 0;

      // @Cleanup
      for (const component of Object.values(this.serverComponents)) {
         if (typeof component.onHit !== "undefined") {
            component.onHit(isDamagingHit);
         }
      }
      for (const component of Object.values(this.clientComponents)) {
         if (typeof component.onHit !== "undefined") {
            component.onHit(isDamagingHit);
         }
      }
   }

   public registerStoppedHit(hitData: HitData): void {
      for (let i = 0; i < 6; i++) {
         const position = this.position.offset(randFloat(0, 6), 2 * Math.PI * Math.random());
         createSparkParticle(position.x, position.y);
      }
   }

   public createHealingParticles(amountHealed: number): void {
      // Create healing particles depending on the amount the entity was healed
      let remainingHealing = amountHealed;
      for (let size = 2; size >= 0;) {
         if (remainingHealing >= HEALING_PARTICLE_AMOUNTS[size]) {
            const position = getRandomPointInEntity(this);
            createHealingParticle(position, size);
            remainingHealing -= HEALING_PARTICLE_AMOUNTS[size];
         } else {
            size--;
         }
      }
   }
}

export default Entity;