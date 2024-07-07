import { Point, clampToBoardDimensions, randFloat, randInt, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import { EntityID, EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { EntityDebugData, RIVER_STEPPING_STONE_SIZES } from "webgl-test-shared/dist/client-server-types";
import { TileType } from "webgl-test-shared/dist/tiles";
import Board from "./Board";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { resolveEntityTileCollision } from "./collision";
import { STRUCTURE_TYPES, StructureType } from "webgl-test-shared/dist/structures";
import { hitboxIsCircular } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { TransformComponentArray } from "./components/TransformComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentClassRecord, ComponentConfig, ComponentParams } from "./components";
import { ComponentArray, ComponentArrayRecord } from "./components/ComponentArray";

let idCounter = 1;

// @Cleanup: file?
/** Finds a unique available ID for an entity */
export function getNextEntityID(): EntityID {
   return idCounter++;
}

// @Hack
const a = <ComponentTypes extends ServerComponentType>(componentConfig: ComponentConfig<ComponentTypes>): ReadonlyArray<ComponentTypes> => {
   return Object.keys(componentConfig).map(Number) as Array<ComponentTypes>;
}

// @Cleanup: maybe rename once other generic one is reworked?
// export function createEntityFromConfig<ComponentTypes extends ServerComponentType>(componentTypes: ReadonlyArray<ComponentTypes>, componentConfig: ComponentConfig<ComponentTypes>): void {
export function createEntityFromConfig<ComponentTypes extends ServerComponentType>(componentConfig: ComponentConfig<ComponentTypes>): void {
   const id = getNextEntityID();
   // @Hack
   const componentTypes = a(componentConfig);
   
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const params = componentConfig[componentType];

      const constructor = ComponentClassRecord[componentType] as { new (args: ComponentParams<ComponentTypes>): unknown };
      const component = new constructor(params) as typeof constructor;

      const componentArray = ComponentArrayRecord[componentType] as ComponentArray<ComponentTypes>;
      componentArray.addComponent(id, component);
   }
}

/** A generic class for any object in the world */
class Entity<T extends EntityType = EntityType> {
   public strictCheckIsInRiver(): void {
      if (this.tile.type !== TileType.water) {
         this.isInRiver = false;
         return;
      }

      if (PhysicsComponentArray.hasComponent(this.id)) {
         const physicsComponent = PhysicsComponentArray.getComponent(this.id);
         if (!physicsComponent.isAffectedByFriction) {
            this.isInRiver = false;
            return;
         }
      }

      // If the game object is standing on a stepping stone they aren't in a river
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const distX = this.position.x - steppingStone.positionX;
            const distY = this.position.y - steppingStone.positionY;
            if (distX * distX + distY * distY <= size * size / 4) {
               this.isInRiver = false;
               return;
            }
         }
      }

      this.isInRiver = true;
   }

   public checkIsInRiver(): void {
      if (typeof this.tile === "undefined") {
         console.log("tile undefined???");
      }
      
      if (this.tile.type !== TileType.water) {
         this.isInRiver = false;
         return;
      }

      const physicsComponent = PhysicsComponentArray.getComponent(this.id);
      if (!physicsComponent.isAffectedByFriction) {
         this.isInRiver = false;
         return;
      }

      // If the game object is standing on a stepping stone they aren't in a river
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const distX = this.position.x - steppingStone.positionX;
            const distY = this.position.y - steppingStone.positionY;
            if (distX * distX + distY * distY <= size * size / 4) {
               this.isInRiver = false;
               return;
            }
         }
      }

      this.isInRiver = true;
   }

   public resolveWallTileCollisions(): void {
      // Looser check that there are any wall tiles in any of the entities' chunks
      let hasWallTiles = false;
      for (let i = 0; i < this.chunks.length; i++) {
         const chunk = this.chunks[i];
         if (chunk.hasWallTiles) {
            hasWallTiles = true;
         }
      }
      if (!hasWallTiles) {
         return;
      }
      
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];

         const boundsMinX = hitbox.calculateHitboxBoundsMinX();
         const boundsMaxX = hitbox.calculateHitboxBoundsMaxX();
         const boundsMinY = hitbox.calculateHitboxBoundsMinY();
         const boundsMaxY = hitbox.calculateHitboxBoundsMaxY();

         const minTileX = clampToBoardDimensions(Math.floor(boundsMinX / Settings.TILE_SIZE));
         const maxTileX = clampToBoardDimensions(Math.floor(boundsMaxX / Settings.TILE_SIZE));
         const minTileY = clampToBoardDimensions(Math.floor(boundsMinY / Settings.TILE_SIZE));
         const maxTileY = clampToBoardDimensions(Math.floor(boundsMaxY / Settings.TILE_SIZE));

         for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
            for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
               const tile = Board.getTile(tileX, tileY);
               if (tile.isWall) {
                  resolveEntityTileCollision(this, hitbox, tileX, tileY);
               }
            }
         }
      }
   }
   
   public resolveBorderCollisions(): void {
      // Left border
      if (this.boundingAreaMinX < 0) {
         const physicsComponent = PhysicsComponentArray.getComponent(this.id);
         this.position.x -= this.boundingAreaMinX;
         physicsComponent.velocity.x = 0;
         physicsComponent.positionIsDirty = true;
         // Right border
      } else if (this.boundingAreaMaxX > Settings.BOARD_UNITS) {
         const physicsComponent = PhysicsComponentArray.getComponent(this.id);
         this.position.x -= this.boundingAreaMaxX - Settings.BOARD_UNITS;
         physicsComponent.velocity.x = 0;
         physicsComponent.positionIsDirty = true;
      }

      // Bottom border
      if (this.boundingAreaMinY < 0) {
         const physicsComponent = PhysicsComponentArray.getComponent(this.id);
         this.position.y -= this.boundingAreaMinY;
         physicsComponent.velocity.y = 0;
         physicsComponent.positionIsDirty = true;
         // Top border
      } else if (this.boundingAreaMaxY > Settings.BOARD_UNITS) {
         const physicsComponent = PhysicsComponentArray.getComponent(this.id);
         this.position.y -= this.boundingAreaMaxY - Settings.BOARD_UNITS;
         physicsComponent.velocity.y = 0;
         physicsComponent.positionIsDirty = true;
      }

      // @Temporary
      if (this.position.x < 0 || this.position.x >= Settings.BOARD_UNITS || this.position.y < 0 || this.position.y >= Settings.BOARD_UNITS) {
         console.log(this);
         throw new Error("Unable to properly resolve border collisions for " + EntityTypeString[this.type] + ".");
      }
   }

   public getDebugData(): EntityDebugData {
      return {
         entityID: this.id,
         lines: [],
         circles: [],
         tileHighlights: [],
         debugEntries: []
      };
   }
}

export default Entity;

export function entityIsStructure(entity: EntityID): boolean {
   return STRUCTURE_TYPES.indexOf(Board.getEntityType(entity) as StructureType) !== -1;
}

export function getRandomPositionInEntity(entity: EntityID): Point {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const hitbox = transformComponent.hitboxes[randInt(0, transformComponent.hitboxes.length - 1)];

   if (hitboxIsCircular(hitbox)) {
      return hitbox.position.offset(hitbox.radius * Math.random(), 2 * Math.PI * Math.random());
   } else {
      const halfWidth = hitbox.width / 2;
      const halfHeight = hitbox.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      const x = transformComponent.position.x + rotateXAroundOrigin(xOffset, yOffset, transformComponent.rotation + hitbox.rotation);
      const y = transformComponent.position.y + rotateYAroundOrigin(xOffset, yOffset, transformComponent.rotation + hitbox.rotation);
      return new Point(x, y);
   }
}