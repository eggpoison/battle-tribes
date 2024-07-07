import { ItemType } from "webgl-test-shared/dist/items/items";
import { createItemEntity } from "./entities/item-entity";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./components/TransformComponent";

/**
 * @param itemSpawnRange Ideally should be a bit larger than the entity's size.
 */
export function createItemsOverEntity(entity: EntityID, itemType: ItemType, amount: number, itemSpawnRange: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < amount; i++) {
      const magnitude = Math.random() * itemSpawnRange;
      const direction = 2 * Math.PI * Math.random();

      const position = transformComponent.position.copy();
      position.x += magnitude * Math.sin(direction);
      position.y += magnitude * Math.cos(direction);

      createItemEntity(position, 2 * Math.PI * Math.random(), itemType, 1, 0);
   }
}