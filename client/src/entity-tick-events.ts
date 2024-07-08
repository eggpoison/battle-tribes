import { EntityTickEvent, EntityTickEventType } from "webgl-test-shared/dist/entity-events";
import Entity from "./Entity";
import { randFloat } from "webgl-test-shared/dist/utils";
import { playSound } from "./sound";
import { ItemType } from "webgl-test-shared/dist/items/items";
import Board from "./Board";

export function playBowFireSound(sourceEntity: Entity, bowItemType: ItemType): void {
   switch (bowItemType) {
      case ItemType.wooden_bow: {
         playSound("bow-fire.mp3", 0.4, 1, sourceEntity.position.x, sourceEntity.position.y);
         break;
      }
      case ItemType.reinforced_bow: {
         playSound("reinforced-bow-fire.mp3", 0.2, 1, sourceEntity.position.x, sourceEntity.position.y);
         break;
      }
      case ItemType.ice_bow: {
         playSound("ice-bow-fire.mp3", 0.4, 1, sourceEntity.position.x, sourceEntity.position.y);
         break;
      }
   }
}

const processTickEvent = (entity: Entity, tickEvent: EntityTickEvent): void => {
   switch (tickEvent.type) {
      case EntityTickEventType.cowFart: {
         playSound("fart.mp3", 0.3, randFloat(0.9, 1.2), entity.position.x, entity.position.y);
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