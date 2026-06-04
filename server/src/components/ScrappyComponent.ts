import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity } from "../../../shared/dist/entities.js";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/dist/entity-events.js";
import { InventoryName } from "../../../shared/dist/items/items.js";
import { Settings } from "../../../shared/dist/settings.js";
import { randFloat } from "../../../shared/dist/utils.js";
import { throwItem } from "../entities/tribes/tribe-member.js";
import { getHitboxVelocity, setHitboxVelocity } from "../hitboxes.js";
import { registerEntityTickEvent } from "../server/player-clients.js";
import { ComponentArray } from "./ComponentArray.js";
import { getInventory, InventoryComponentArray } from "./InventoryComponent.js";
import { TransformComponentArray } from "./TransformComponent.js";

const enum Vars {
   MIN_ACCIDENT_INTERVAL = 2 * Settings.TICK_RATE,
   MAX_ACCIDENT_INTERVAL = 4 * Settings.TICK_RATE
}

export class ScrappyComponent {
   public accidentTimer = randFloat(Vars.MIN_ACCIDENT_INTERVAL, Vars.MAX_ACCIDENT_INTERVAL);
}

export const ScrappyComponentArray = new ComponentArray<ScrappyComponent>(ServerComponentType.scrappy, true, getDataLength, addDataToPacket);
ScrappyComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onTick(scrappy: Entity): void {
   // @Copynpaste

   // const aiHelperComponent = AIHelperComponentArray.getComponent(scrappy);

   // const visibleEnemies = new Array<Entity>();
   // const visibleEnemyBuildings = new Array<Entity>();
   // const visibleHostileMobs = new Array<Entity>();
   // const visibleItemEntities = new Array<Entity>();
   // for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
   //    const entity = aiHelperComponent.visibleEntities[i];

   //    // @Temporary: may want to reintroduce
   //    // But use paths instead!! :D
   //    // if (!entityIsAccessible(tribesman, entity)) {
   //    //    continue;
   //    // }

   //    switch (getEntityRelationship(scrappy, entity)) {
   //       case EntityRelationship.enemy: {
   //          visibleEnemies.push(entity);
   //          break;
   //       }
   //       case EntityRelationship.enemyBuilding: {
   //          visibleEnemyBuildings.push(entity);
   //          break;
   //       }
   //       case EntityRelationship.hostileMob: {
   //          visibleHostileMobs.push(entity);
   //          break;
   //       }
   //       case EntityRelationship.neutral: {
   //          if (getEntityType(entity) === EntityType.itemEntity) {
   //             visibleItemEntities.push(entity);
   //          }
   //          break;
   //       }
   //    }
   // }
   
   // runAssignmentAI(scrappy, visibleItemEntities);

   const scrappyComponent = ScrappyComponentArray.getComponent(scrappy);
   scrappyComponent.accidentTimer--;
   if (scrappyComponent.accidentTimer <= 0) {
      scrappyComponent.accidentTimer = randFloat(Vars.MIN_ACCIDENT_INTERVAL, Vars.MAX_ACCIDENT_INTERVAL);

      const inventoryComponent = InventoryComponentArray.getComponent(scrappy);
      const hotbar = getInventory(inventoryComponent, InventoryName.hotbar);
      
      const transformComponent = TransformComponentArray.getComponent(scrappy);
      const scrappyHitbox = transformComponent.hitboxes[0];

      let hasAccident = false;
      if (hotbar.hasItem(1) && Math.random() < 0.7) {
         hasAccident = true;

         // Drop the item
         throwItem(scrappy, InventoryName.hotbar, 1, 99, scrappyHitbox.box.angle + randFloat(-0.3, 0.3));
      } else {
         const velocity = getHitboxVelocity(scrappyHitbox);
         if (velocity.magnitude() > 100) {
            hasAccident = true;
            setHitboxVelocity(scrappyHitbox, velocity.x * 0.3, velocity.y * 0.3);
         }
      }
      
      if (hasAccident) {
         const tickEvent: EntityTickEvent = {
            entityID: scrappy,
            type: EntityTickEventType.automatonAccident,
            data: 0
         };
         registerEntityTickEvent(scrappy, tickEvent);
      }
   }
}