import Board from "./Board";
import TribeStash from "./entities/TribeStash";
import Entity from "./entities/Entity";
import { getRandomAngle, Point, randFloat, Vector } from "./utils";
import Tribesman from "./entities/tribe-members/Tribesman";
import Slime from "./entities/mobs/Slime";
import HealthComponent from "./entity-components/HealthComponent";
import Cow from "./entities/mobs/Cow";
import { getEntityInfo } from "./entity-info";
import TransformComponent from "./entity-components/TransformComponent";

// const tribeExpRequirements = [
//    5,
//    25,
//    100,
//    250,
//    1000
// ];

const tribeExpRequirements = [
   1,
   2,
   3,
   4,
   5,
   6,
   7,
   8,
   9,
   10
];

// Tribe members are created through the tribe class
// Other entities such as the player are added to the tribe in their constructor
class Tribe {
   private readonly entities: Array<Entity> = new Array<Entity>();

   public readonly position: Point;
   public readonly stash: TribeStash;
   public readonly colour: string;

   private exp: number = 0;
   private tribeLevel: number = 0;

   constructor(position: Point, colour: string) {
      this.position = position;
      this.colour = colour;

      // Create a tribe stash
      this.stash = new TribeStash(this);
      Board.addEntity(this.stash);
      this.addEntityToTribe(this.stash);

      // for (let i = 0; i < 360; i++) {
      //    const radians = i / 180 * Math.PI;

      //    const OFFSET = 6;
      //    // const OFFSET = 35 * (Math.random() + 0.2);
      //    const a = new Vector(OFFSET * Board.tileSize, radians);
      //    const pos = this.position.add(a.convertToPoint());

      //    const ree = new Slime(pos, 3);
      //    ree.setInfo(getEntityInfo(ree));
      //    ree.getComponent(HealthComponent)!.setMaxHealth(1, true);
      //    Board.addEntity(ree);
      // }

      // for (let i = 0; i < 1000; i++) {
      //    const rad = i / 180 * Math.PI;

      //    const OFFSET = 35 * Math.random() * Board.tileSize;
      //    const a = this.position.add(new Vector(OFFSET, rad).convertToPoint());

      //    const m = new Cow(a);
      //    m.setInfo(getEntityInfo(m));
      //    Board.addEntity(m);
      // }

      const n = 50;
      for (let i = 0; i < 360; i += 360 / n) {
         const radians = i / 180 * Math.PI;

         const OFFSET = 7;
         const a = new Vector(OFFSET * Board.tileSize, radians);
         const pos = this.position.add(a.convertToPoint());

         const ree = new Slime(pos);
         ree.setInfo(getEntityInfo(ree));
         Board.addEntity(ree);
      }
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

      if (this.exp >= tribeExpRequirements[this.tribeLevel]) {
         this.levelUp();
      }
   }

   public createTribeMember(): void {
      const tribesman = new Tribesman(this);
      Board.addEntity(tribesman);
   }

   public addEntityToTribe(entity: Entity): void {
      this.entities.push(entity);
   }

   public static getPlayerTribeSpawnPosition(): Point {
      /** % of the board in each direction that the player can't spawn in */
      const PADDING = 40;

      const x = Board.dimensions * Board.tileSize * randFloat(PADDING / 100, 1 - PADDING / 100);
      const y = Board.dimensions * Board.tileSize * randFloat(PADDING / 100, 1 - PADDING / 100);

      return new Point(x, y);
   }

   public getMemberSpawnPosition(): Point {
      const OFFSET = 2;

      const offsetPoint = new Vector(OFFSET * Board.tileSize, getRandomAngle()).convertToPoint();
      const position = this.position.add(offsetPoint);
      return position;
   }
}

export default Tribe;