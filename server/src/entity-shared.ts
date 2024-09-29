import { ItemType } from "battletribes-shared/items/items";
import { EntityID } from "battletribes-shared/entities";
import { TransformComponentArray } from "./components/TransformComponent";
import { createItemEntityConfig } from "./entities/item-entity";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityFromConfig } from "./Entity";
import { getEntityLayer } from "./world";

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

      // Create item entity
      const config = createItemEntityConfig();
      config[ServerComponentType.transform].position.x = position.x;
      config[ServerComponentType.transform].position.y = position.y;
      config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config[ServerComponentType.item].itemType = itemType;
      config[ServerComponentType.item].amount = 1;
      createEntityFromConfig(config, getEntityLayer(entity));
   }
}