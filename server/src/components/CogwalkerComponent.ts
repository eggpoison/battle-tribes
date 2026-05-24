import { Settings, ServerComponentType, Entity, EntityType, EntityTickEvent, EntityTickEventType } from "battletribes-shared";
import { getHitboxVelocity, Hitbox, setHitboxVelocity } from "../hitboxes.js";
import { registerEntityTickEvent } from "../server/player-clients.js";
import { getEntityAgeTicks, getEntityType } from "../world.js";
import { AIHelperComponentArray } from "./AIHelperComponent.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { EntityRelationship, getEntityRelationship } from "./TribeComponent.js";

export class CogwalkerComponent {}

export const CogwalkerComponentArray = new ComponentArray<CogwalkerComponent>(ServerComponentType.cogwalker, true, getDataLength, addDataToPacket);
CogwalkerComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onTick(cogwalker: Entity): void {
   // @Copynpaste

   const aiHelperComponent = AIHelperComponentArray.getComponent(cogwalker);

   const visibleEnemies: Array<Entity> = [];
   const visibleEnemyBuildings: Array<Entity> = [];
   const visibleHostileMobs: Array<Entity> = [];
   const visibleItemEntities: Array<Entity> = [];
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      // @Temporary: may want to reintroduce
      // But use paths instead!! :D
      // if (!entityIsAccessible(tribesman, entity)) {
      //    continue;
      // }

      switch (getEntityRelationship(cogwalker, entity)) {
         case EntityRelationship.enemy: {
            visibleEnemies.push(entity);
            break;
         }
         case EntityRelationship.enemyBuilding: {
            visibleEnemyBuildings.push(entity);
            break;
         }
         case EntityRelationship.hostileMob: {
            visibleHostileMobs.push(entity);
            break;
         }
         case EntityRelationship.neutral: {
            if (getEntityType(entity) === EntityType.itemEntity) {
               visibleItemEntities.push(entity);
            }
            break;
         }
      }
   }
   
   // @Temporaryh
   // runAssignmentAI(cogwalker, visibleItemEntities);


   // @Hack @Copynpaste
   if (getEntityAgeTicks(cogwalker) % (Settings.TICK_RATE * 4) === 0) {
      let hasAccident = false;
      {
         const transformComponent = TransformComponentArray.getComponent(cogwalker);
         const hitbox = transformComponent.hitboxes[0];
         if (getHitboxVelocity(hitbox).magnitude() > 100) {
            hasAccident = true;
            setHitboxVelocity(hitbox, 0, 0);
         }
      }
      
      if (hasAccident) {
         const tickEvent: EntityTickEvent = {
            entityID: cogwalker,
            type: EntityTickEventType.automatonAccident,
            data: 0
         };
         registerEntityTickEvent(cogwalker, tickEvent);
      }
   }
}