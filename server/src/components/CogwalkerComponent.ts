import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { Settings } from "../../../shared/src/settings";
import { getHitboxVelocity, Hitbox, setHitboxVelocity } from "../hitboxes";
import { registerEntityTickEvent } from "../server/player-clients";
import { getEntityAgeTicks, getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRelationship, getEntityRelationship } from "./TribeComponent";

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

   const visibleEnemies = new Array<Entity>();
   const visibleEnemyBuildings = new Array<Entity>();
   const visibleHostileMobs = new Array<Entity>();
   const visibleItemEntities = new Array<Entity>();
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