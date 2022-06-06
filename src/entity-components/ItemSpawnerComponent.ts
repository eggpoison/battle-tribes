import Board from "../Board";
import Component from "../Component";
import ItemEntity from "../entities/ItemEntity";
import { EventType } from "../entities/Entity";
import ITEMS, { ItemName } from "../items/items";
import { getRandomAngle, Point, randInt, Vector } from "../utils";
import TransformComponent from "./TransformComponent";

class ItemSpawnComponent extends Component {
   public spawnResource(itemName: ItemName, amount: number = 1): void {
      if (amount < 1) return;

      const item = ITEMS[itemName];

      for (let i = 0; i < amount; i++) {
         const position = this.getSpawnPosition();
         
         const resource = new ItemEntity(position, item, 1);
         Board.addEntity(resource);
      }
   }

   public addResource(itemName: ItemName, amount: number | [number, number], eventType: EventType): void {
      const entity = this.getEntity();

      entity.createEvent(eventType, () => {
         const spawnAmount = typeof amount === "number" ? amount : randInt(amount[0], amount[1]);
         this.spawnResource(itemName, spawnAmount);
      });
   }

   /** Gets a random position around the entity */
   private getSpawnPosition(): Point {
      const entity = this.getEntity();
      const entityPosition = entity.getComponent(TransformComponent)!.position;

      const OFFSET_RANGE = 0.5;

      const offsetVector = new Vector(OFFSET_RANGE * Board.tileSize, getRandomAngle());
      const offset = offsetVector.convertToPoint();

      const position = entityPosition.add(offset);
      return position;
   }
}

export default ItemSpawnComponent;