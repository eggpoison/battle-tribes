import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import Entity from "./Entity";
import { randFloat } from "battletribes-shared/utils";
import { playSound } from "./sound";
import { ItemType } from "battletribes-shared/items/items";
import Board from "./Board";
import { ServerComponentType } from "battletribes-shared/components";

export function playBowFireSound(sourceEntity: Entity, bowItemType: ItemType): void {
   const transformComponent = sourceEntity.getServerComponent(ServerComponentType.transform);
   
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

const processTickEvent = (entity: Entity, tickEvent: EntityTickEvent): void => {
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);

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
      
      const entity = Board.entityRecord[entityTickEvent.entityID];
      if (typeof entity !== "undefined") {
         processTickEvent(entity, entityTickEvent);
      }
   }
}