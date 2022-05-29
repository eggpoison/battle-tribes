import Board, { Coordinates } from "./Board";
import TribeStash from "./entities/TribeStash";
import Entity from "./entities/Entity";
import { getRandomAngle, Point, randItem, Vector } from "./utils";
import Tribesman from "./entities/tribe-members/Tribesman";
import HealthComponent from "./entity-components/HealthComponent";
import TransformComponent from "./entity-components/TransformComponent";
import InventoryViewerManager from "./components/inventory/InventoryViewerManager";
import Chief from "./entities/tribe-members/Chief";
import InfiniteInventoryComponent from "./entity-components/inventory/InfiniteInventoryComponent";
import TRIBE_INFO, { TribeTypes } from "./tribe-info";
import Player from "./entities/tribe-members/Player";
import { setTribeEXPBarAmount } from "./components/TribeXPBar";

// const tribeExpRequirements = [
//    5,
//    25,
//    100,
//    250,
//    1000
// ];

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
      const tribesman = new Tribesman(this);
      Board.addEntity(tribesman);
   }

   public addEntityToTribe(entity: Entity): void {
      this.members.push(entity);
   }

   public static spawnTribes(): void {
      // Spawn all non-player tribes
      const keys = Object.keys(TRIBE_INFO) as Array<TribeTypes>;
      for (const type of keys) {
         const position = this.getTribeSpawnPosition(type);

         const tribe = new Tribe(position, type);

         if (type === "humans") {
            // Link the player tribe's stash to the stash viewer
            const stash = tribe.stash;
            InventoryViewerManager.getInstance("tribeStash").setInventoryComponent(stash.getComponent(InfiniteInventoryComponent)!);
         }
      }
   }

   private static getTribeSpawnPosition(type: TribeTypes): Point {
      /** % of the board in each direction that the tribe can't spawn in */
      const PADDING = 20;

      // Calculate spawn area bounds
      const minX = Math.floor(Board.dimensions * PADDING / 100);
      const maxX = Math.ceil(Board.dimensions * (1 - PADDING / 100));
      const minY = Math.ceil(Board.dimensions * PADDING / 100);
      const maxY = Math.ceil(Board.dimensions * (1 - PADDING / 100));

      const eligibleTiles = new Array<Coordinates>();

      // Find all grasslands tiles
      for (let x = minX; x <= maxX; x++) {
         for (let y = minY; y <= maxY; y++) {
            const tile = Board.getTile(x, y);

            if (tile.biome.name === TRIBE_INFO[type].biome) {
               eligibleTiles.push([x, y]);
            }
         }
      }

      // Pick a random eligible tile to spawn the player in
      const [spawnTileX, spawnTileY] = randItem(eligibleTiles);

      return Board.getRandomPositionInTile(spawnTileX, spawnTileY);
   }

   public getMemberSpawnPosition(): Point {
      const OFFSET = 2;

      const offsetPoint = new Vector(OFFSET * Board.tileSize, getRandomAngle()).convertToPoint();
      const position = this.position.add(offsetPoint);
      return position;
   }
}

export default Tribe;