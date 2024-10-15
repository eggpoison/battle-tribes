import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import { randFloat } from "battletribes-shared/utils";
import { playSound } from "./sound";
import { ItemType } from "battletribes-shared/items/items";
import { entityExists } from "./world";
import { EntityID } from "../../shared/src/entities";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";

export function playBowFireSound(sourceEntity: EntityID, bowItemType: ItemType): void {
   const transformComponent = TransformComponentArray.getComponent(sourceEntity);
   
   switch (bowItemType) {
      case ItemType.wooden_bow: {
         playSound("bow-fire.mp3", 0.4, 1, transformComponent.position);
         break;
      }
      case ItemType.reinforced_bow: {
         playSound("reinforced-bow-fire.mp3", 0.2, 1, transformComponent.position);
         break;
      }
      case ItemType.ice_bow: {
         playSound("ice-bow-fire.mp3", 0.4, 1, transformComponent.position);
         break;
      }
   }
}

const processTickEvent = (entity: EntityID, tickEvent: EntityTickEvent): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);

   switch (tickEvent.type) {
      case EntityTickEventType.cowFart: {
         playSound("fart.mp3", 0.3, randFloat(0.9, 1.2), transformComponent.position);
         break;
      }
      case EntityTickEventType.fireBow: {
         // @Cleanup: why need cast?
         playBowFireSound(entity, tickEvent.data as ItemType);
         break;
      }
   }
}

export function processTickEvents(tickEvents: ReadonlyArray<EntityTickEvent>): void {
   for (let i = 0; i < tickEvents.length; i++) {
      const entityTickEvent = tickEvents[i];
      
      if (entityExists(entityTickEvent.entityID)) {
         processTickEvent(entityTickEvent.entityID, entityTickEvent);
      }
   }
}