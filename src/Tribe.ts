import Board, { Coordinates } from "./Board";
import TribeStash from "./entities/TribeStash";
import Entity from "./entities/Entity";
import { getRandomAngle, Point, randItem, Vector } from "./utils";
import Warrior from "./entities/tribe-members/Warrior";
import HealthComponent from "./entity-components/HealthComponent";
import TransformComponent from "./entity-components/TransformComponent";
import Chief from "./entities/tribe-members/Chief";
import TRIBE_INFO, { TribeTypes } from "./data/tribe-info";
import Player from "./entities/tribe-members/Player";
import { setTribeEXPBarAmount } from "./components/TribeXPBar";

export const TRIBE_XP_REQUIREMENTS = [
   1,
   3,
   5,
   10,
   15,
   25,
   50,
   75,
   100,
   150,
   250,
   500,
   750,
   1000,
   1500
];

type TribeCoordinatesRecord = Partial<{ [key in TribeTypes]: Coordinates }>;

const getPotentialTribeSpawnCoordinates = (type: TribeTypes): Array<Coordinates> => {
   /** % of the board in each direction that the tribe can't spawn in */
   const PADDING = 20;

   // Calculate spawn area bounds
   const minX = Math.floor(Board.dimensions * PADDING / 100);
   const maxX = Math.ceil(Board.dimensions * (1 - PADDING / 100));
   const minY = Math.ceil(Board.dimensions * PADDING / 100);
   const maxY = Math.ceil(Board.dimensions * (1 - PADDING / 100));

   // All tiles where the tribe could potentially spawn
   const eligibleTiles = new Array<Coordinates>();

   // Find all grasslands tiles
   for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
         const tile = Board.getTile(x, y);

         if (tile.biome.name === TRIBE_INFO[type].biome && !tile.isWall) {
            eligibleTiles.push([x, y]);
         }
      }
   }

   return eligibleTiles;
}

const getTribeSpawnCoordinates = (type: TribeTypes, tribePositions: TribeCoordinatesRecord): Coordinates => {
   const potentialTiles = getPotentialTribeSpawnCoordinates(type);

   // If no other tribes have been created, just choose a random position for the tribe
   if (Object.keys(tribePositions).length === 0) {
      return randItem(potentialTiles);
   }

   // Otherwise find the tile with the highest minimum distance from all other tribes
   let furthestTile!: Coordinates;
   let furthestDistance: number = -1;
   for (const tile of potentialTiles) {
      const [x, y] = tile;

      // Calculate the distance from the tile to the other tribes
      const distancesFromOtherTribes = new Array<number>();
      for (const [tribeX, tribeY] of Object.values(tribePositions)) {
         const dist = Math.sqrt(Math.pow(x - tribeX, 2) + Math.pow(y - tribeY, 2));
         distancesFromOtherTribes.push(dist);
      }

      const minDist = Math.min(...distancesFromOtherTribes);
      if (minDist > furthestDistance) {
         furthestTile = tile;
         furthestDistance = minDist;
      }
   }

   return furthestTile;
}

export function spawnTribes(): void {
   const tribeCoordinates: TribeCoordinatesRecord = {};

   // Spawn all tribes
   const keys = Object.keys(TRIBE_INFO) as Array<TribeTypes>;
   for (const type of keys) {
      // Get a valid position for the tribe to spawn in
      const spawnCoordinates = getTribeSpawnCoordinates(type, tribeCoordinates);
      const spawnPosition = Board.getRandomPositionInTile(...spawnCoordinates);

      new Tribe(spawnPosition, type);

      // Store the tribe position for later use
      tribeCoordinates[type] = spawnCoordinates;
   }
}

// Tribe members are created through the tribe class
// Other entities such as the player are added to the tribe in their constructor
class Tribe {
   public readonly members: Array<Entity> = new Array<Entity>();

   public readonly position: Point;
   public readonly stash: TribeStash;
   public readonly type: TribeTypes;

   private exp: number = 0;
   private tribeLevel: number = 0;

   constructor(position: Point, type: TribeTypes) {
      this.position = position;
      this.type = type;

      // Create the chief
      let chief!: Chief;
      if (type === "humans") {
         chief = new Player(this);
      } else {
         chief = new Chief(this);
      }
      Board.addEntity(chief);
      this.addEntityToTribe(chief);

      if (type !== "humans") {
         this.addExp(1);
      }

      // Create a tribe stash
      this.stash = new TribeStash(this);
      Board.addEntity(this.stash);
      this.addEntityToTribe(this.stash);
   }

   public respawnEntity(entity: Entity): void {
      // Restore the entity's health
      const healthComponent = entity.getComponent(HealthComponent)!;
      healthComponent.heal(healthComponent.getMaxHealth());

      // Set its position
      const unitVector = Vector.randomUnitVector();
      unitVector.magnitude *= 5 * Board.tileSize * Math.random();
      const spawnPosition = this.position.add(unitVector.convertToPoint());
      entity.getComponent(TransformComponent)!.position = spawnPosition;

      Board.addEntity(entity);
   }

   private levelUp(): void {
      this.tribeLevel++;

      this.createTribeMember();
   }

   public addExp(amount: number): void {
      this.exp += amount;

      while (this.exp >= TRIBE_XP_REQUIREMENTS[this.tribeLevel]) {
         this.levelUp();
      }

      // Update the XP Bar
      if (this.type === "humans") {
         setTribeEXPBarAmount(this.exp);
      }
   }

   public createTribeMember(): void {
      const tribesman = new Warrior(this);
      Board.addEntity(tribesman);
   }

   public addEntityToTribe(entity: Entity): void {
      this.members.push(entity);
   }

   public getMemberSpawnPosition(): Point {
      const OFFSET = 2;

      const offsetPoint = new Vector(OFFSET * Board.tileSize, getRandomAngle()).convertToPoint();
      const position = this.position.add(offsetPoint);
      return position;
   }
}

export default Tribe;