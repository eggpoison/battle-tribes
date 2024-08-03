import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome } from "webgl-test-shared/dist/tiles";
import { randInt, TileIndex, UtilVars } from "webgl-test-shared/dist/utils";
import { moveEntityToPosition, entityHasReachedPosition, stopEntity } from "../ai-shared";
import { chooseEscapeEntity, runFromAttackingEntity } from "../ai/escape-ai";
import { shouldWander, getWanderTargetTile, wander } from "../ai/wander-ai";
import Board from "../Board";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { EscapeAIComponentArray, updateEscapeAIComponent } from "./EscapeAIComponent";
import { FollowAIComponentArray, updateFollowAIComponent, entityWantsToFollow, startFollowingEntity } from "./FollowAIComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { WanderAIComponentArray } from "./WanderAIComponent";
import { KrumblidVars } from "../entities/mobs/krumblid";

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

function onTick(krumblid: EntityID): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(krumblid);
   
   // Escape AI
   const escapeAIComponent = EscapeAIComponentArray.getComponent(krumblid);
   updateEscapeAIComponent(escapeAIComponent, 5 * Settings.TPS);
   if (escapeAIComponent.attackingEntities.length > 0) {
      const escapeEntity = chooseEscapeEntity(krumblid, aiHelperComponent.visibleEntities);
      if (escapeEntity !== null) {
         runFromAttackingEntity(krumblid, escapeEntity, 500, Vars.TURN_SPEED);
         return;
      }
   }
   
   // Follow AI: Make the krumblid like to hide in cacti
   const followAIComponent = FollowAIComponentArray.getComponent(krumblid);
   updateFollowAIComponent(krumblid, aiHelperComponent.visibleEntities, 5);

   const followedEntity = followAIComponent.followTargetID;
   if (Board.hasEntity(followedEntity)) {
      const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
      // Continue following the entity
      moveEntityToPosition(krumblid, followedEntityTransformComponent.position.x, followedEntityTransformComponent.position.y, 200, Vars.TURN_SPEED);
      return;
   } else if (entityWantsToFollow(followAIComponent)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (Board.getEntityType(entity) === EntityType.player) {
            // Follow the entity
            startFollowingEntity(krumblid, entity, 200, Vars.TURN_SPEED, randInt(KrumblidVars.MIN_FOLLOW_COOLDOWN, KrumblidVars.MAX_FOLLOW_COOLDOWN));
            return;
         }
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(krumblid);

   // Wander AI
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
      } while (++attempts <= 50 && (Board.tileIsWalls[targetTile] === 1 || Board.tileBiomes[targetTile] !== Biome.desert));

      const tileX = Board.getTileX(targetTile);
      const tileY = Board.getTileY(targetTile);
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