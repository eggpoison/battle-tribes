import { ServerComponentType, YetiComponentData } from "webgl-test-shared/dist/components";
import Tile from "../Tile";
import { SnowThrowStage, YETI_SNOW_THROW_COOLDOWN } from "../entities/mobs/yeti";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome } from "webgl-test-shared/dist/tiles";
import { randItem } from "webgl-test-shared/dist/utils";
import Board from "../Board";
import { TransformComponentArray } from "./TransformComponent";

export interface YetiComponentParams {
   readonly territory: ReadonlyArray<Tile>;
}

export interface YetiTargetInfo {
   remainingPursueTicks: number;
   totalDamageDealt: number;
}

const MIN_TERRITORY_SIZE = 50;
const MAX_TERRITORY_SIZE = 100;

// /** Stores which tiles belong to which yetis' territories */
let yetiTerritoryTiles: Partial<Record<number, EntityID>> = {};

export class YetiComponent {
   public readonly territory: ReadonlyArray<Tile>;

   // Stores the ids of all entities which have recently attacked the yeti
   public readonly attackingEntities: Partial<Record<number, YetiTargetInfo>> = {};

   public attackTarget: EntityID | null = null;
   public isThrowingSnow = false;
   public snowThrowStage: SnowThrowStage = SnowThrowStage.windup;
   public snowThrowAttackProgress = 1;
   public snowThrowCooldown = YETI_SNOW_THROW_COOLDOWN;
   public snowThrowHoldTimer = 0;

   constructor(params: YetiComponentParams) {
      this.territory = params.territory;
   }
}
export const YetiComponentArray = new ComponentArray<YetiComponent>(ServerComponentType.yeti, true, {
   onJoin: onJoin,
   onRemove: onRemove,
   serialise: serialise
});

const tileBelongsToYetiTerritory = (tileX: number, tileY: number): boolean => {
   const tileIndex = tileY * Settings.BOARD_DIMENSIONS + tileX;
   return yetiTerritoryTiles.hasOwnProperty(tileIndex);
}

const generateYetiTerritoryTiles = (originTileX: number, originTileY: number): ReadonlyArray<Tile> => {
   const territoryTiles = new Array<Tile>();
   // Tiles to expand the territory from
   const spreadTiles = new Array<Tile>();

   const tileIsValid = (tile: Tile): boolean => {
      // Make sure the tile is inside the board
      if (tile.x < 0 || tile.x >= Settings.BOARD_DIMENSIONS || tile.y < 0 || tile.y >= Settings.BOARD_DIMENSIONS) {
         return false;
      }

      return tile.biome === Biome.tundra && !tileBelongsToYetiTerritory(tile.x, tile.y) && !territoryTiles.includes(tile);
   }

   const originTile = Board.getTile(originTileX, originTileY);
   territoryTiles.push(originTile);
   spreadTiles.push(originTile);

   while (spreadTiles.length > 0) {
      // Pick a random tile to expand from
      const idx = Math.floor(Math.random() * spreadTiles.length);
      const tile = spreadTiles[idx];

      const potentialTiles = [
         [tile.x + 1, tile.y],
         [tile.x - 1, tile.y],
         [tile.x, tile.y + 1],
         [tile.x, tile.y - 1]
      ];

      // Remove out of bounds tiles
      for (let i = 3; i >= 0; i--) {
         const tileCoordinates = potentialTiles[i];
         if (!Board.tileIsInBoard(tileCoordinates[0], tileCoordinates[1])) {
            potentialTiles.splice(i, 1);
         }
      }

      let numValidTiles = 0;

      for (let i = potentialTiles.length - 1; i >= 0; i--) {
         const tileCoordinates = potentialTiles[i];
         const tile = Board.getTile(tileCoordinates[0], tileCoordinates[1]);
         if (tileIsValid(tile)) {
            numValidTiles++;
         } else {
            potentialTiles.splice(i, 1);
         }
      }

      if (numValidTiles === 0) {
         spreadTiles.splice(idx, 1);
      } else {
         // Pick a random tile to expand to
         const [tileX, tileY] = randItem(potentialTiles);
         const tile = Board.getTile(tileX, tileY);
         territoryTiles.push(tile);
         spreadTiles.push(tile);
      }

      if (territoryTiles.length >= MAX_TERRITORY_SIZE) {
         break;
      }
   }

   return territoryTiles;
}

const registerYetiTerritory = (yeti: EntityID, territory: ReadonlyArray<Tile>): void => {
   for (const tile of territory) {
      const tileIndex = tile.y * Settings.BOARD_DIMENSIONS + tile.x;
      yetiTerritoryTiles[tileIndex] = yeti;
   }
}

export function yetiSpawnPositionIsValid(positionX: number, positionY: number): boolean {
   const originTileX = Math.floor(positionX / Settings.TILE_SIZE);
   const originTileY = Math.floor(positionY / Settings.TILE_SIZE);

   const territoryTiles = generateYetiTerritoryTiles(originTileX, originTileY);
   return territoryTiles.length >= MIN_TERRITORY_SIZE;
}

const removeYetiTerritory = (tileX: number, tileY: number): void => {
   const tileIndex = tileY * Settings.BOARD_DIMENSIONS + tileX;
   delete yetiTerritoryTiles[tileIndex];
}

export function resetYetiTerritoryTiles(): void {
   yetiTerritoryTiles = {};
}

function onJoin(yeti: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(yeti);
   
   const territory = generateYetiTerritoryTiles(transformComponent.tile.x, transformComponent.tile.y);
   registerYetiTerritory(yeti, territory);
}

function onRemove(yeti: EntityID): void {
   // Remove territory
   const yetiComponent = YetiComponentArray.getComponent(yeti);
   for (let i = 0; i < yetiComponent.territory.length; i++) {
      const territoryTile = yetiComponent.territory[i];
      removeYetiTerritory(territoryTile.x, territoryTile.y);
   }
}

function serialise(entity: EntityID): YetiComponentData {
   const yetiComponent = YetiComponentArray.getComponent(entity);
   return {
      componentType: ServerComponentType.yeti,
      attackProgress: yetiComponent.snowThrowAttackProgress
   };
}