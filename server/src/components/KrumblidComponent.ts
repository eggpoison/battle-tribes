import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Biome } from "battletribes-shared/tiles";
import { randInt, TileIndex, UtilVars } from "battletribes-shared/utils";
import { moveEntityToPosition, entityHasReachedPosition, stopEntity } from "../ai-shared";
import { chooseEscapeEntity, runFromAttackingEntity } from "../ai/escape-ai";
import { shouldWander, getWanderTargetTile, wander } from "../ai/wander-ai";
import { getTileX, getTileY } from "../Layer";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { EscapeAIComponentArray, updateEscapeAIComponent } from "./EscapeAIComponent";
import { FollowAIComponentArray, updateFollowAIComponent, entityWantsToFollow, startFollowingEntity } from "./FollowAIComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { WanderAIComponentArray } from "./WanderAIComponent";
import { KrumblidVars } from "../entities/mobs/krumblid";
import { entityExists, getEntityLayer, getEntityType } from "../world";

const enum Vars {
   TURN_SPEED = UtilVars.PI * 2
}

export interface KrumblidComponentParams {}

export class KrumblidComponent implements KrumblidComponentParams {}

export const KrumblidComponentArray = new ComponentArray<KrumblidComponent>(ServerComponentType.krumblid, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(_krumblidComponent: KrumblidComponent, krumblid: EntityID): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(krumblid);
   
   // Escape AI
   const escapeAIComponent = EscapeAIComponentArray.getComponent(krumblid);
   updateEscapeAIComponent(escapeAIComponent, 5 * Settings.TPS);
   if (escapeAIComponent.attackingEntities.length > 0) {
      const escapeEntity = chooseEscapeEntity(krumblid, aiHelperComponent.visibleEntities);
      if (escapeEntity !== null) {
         runFromAttackingEntity(krumblid, escapeEntity, 700, Vars.TURN_SPEED);
         return;
      }
   }
   
   // Follow AI: Make the krumblid like to hide in cacti
   const followAIComponent = FollowAIComponentArray.getComponent(krumblid);
   updateFollowAIComponent(krumblid, aiHelperComponent.visibleEntities, 5);

   const followedEntity = followAIComponent.followTargetID;
   if (entityExists(followedEntity)) {
      const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
      // Continue following the entity
      moveEntityToPosition(krumblid, followedEntityTransformComponent.position.x, followedEntityTransformComponent.position.y, 200, Vars.TURN_SPEED);
      return;
   } else if (entityWantsToFollow(followAIComponent)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (getEntityType(entity) === EntityType.player) {
            // Follow the entity
            startFollowingEntity(krumblid, entity, 200, Vars.TURN_SPEED, randInt(KrumblidVars.MIN_FOLLOW_COOLDOWN, KrumblidVars.MAX_FOLLOW_COOLDOWN));
            return;
         }
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(krumblid);

   // Wander AI
   const layer = getEntityLayer(krumblid);
   const wanderAIComponent = WanderAIComponentArray.getComponent(krumblid);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(krumblid, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 0.25)) {
      let attempts = 0;
      let targetTile: TileIndex;
      do {
         targetTile = getWanderTargetTile(krumblid, KrumblidVars.VISION_RANGE);
      } while (++attempts <= 50 && (layer.tileIsWalls[targetTile] === 1 || layer.tileBiomes[targetTile] !== Biome.desert));

      const tileX = getTileX(targetTile);
      const tileY = getTileY(targetTile);
      const x = (tileX + Math.random()) * Settings.TILE_SIZE;
      const y = (tileY + Math.random()) * Settings.TILE_SIZE;
      wander(krumblid, x, y, 200, Vars.TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}