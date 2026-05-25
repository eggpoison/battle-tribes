import { ServerComponentType, Entity, EntityType, ItemType, Settings, assert, Point, randAngle, EntityTickEvent, EntityTickEventType, distance, angle } from "battletribes-shared";
import { CollisionVars, entitiesAreColliding } from "../collision-detection.js";
import { Hitbox } from "../hitboxes.js";
import { destroyEntity, entityExists, getEntityType } from "../world.js";
import { AIHelperComponentArray } from "./AIHelperComponent.js";
import { AttackingEntitiesComponentArray } from "./AttackingEntitiesComponent.js";
import { ComponentArray } from "./ComponentArray.js";
import { updateFollowAIComponent, followAISetFollowTarget, FollowAI, entityWantsToFollow } from "../ai/FollowAI.js";
import { InventoryUseComponentArray } from "./InventoryUseComponent.js";
import { ItemComponentArray } from "./ItemComponent.js";
import { TamingComponentArray } from "./TamingComponent.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { EntityConfig, getConfigTransformComponent } from "../components.js";
import { createGlurbBodySegmentConfig } from "../entities/mobs/glurb-body-segment.js";
import { createGlurbTailSegmentConfig } from "../entities/mobs/glurb-tail-segment.js";
import { registerEntityTickEvent } from "../server/player-clients.js";
import { GlurbSegmentComponentArray } from "./GlurbSegmentComponent.js";
import { tetherGlurbSegments } from "../entities/mobs/glurb.js";
import { getHitboxTethers } from "../tethers.js";

const enum Vars {
   // @Temporary
   // STOMACH_EMPTY_TIME_SECONDS = 25
   STOMACH_EMPTY_TIME_SECONDS = 10
}

export class GlurbHeadSegmentComponent {
   public readonly maxNumSegments: number;
   
   public food = 1;

   constructor(maxNumSegments: number) {
      this.maxNumSegments = maxNumSegments;
   }
}

export const GlurbHeadSegmentComponentArray = new ComponentArray<GlurbHeadSegmentComponent>(ServerComponentType.glurbHeadSegment, true, getDataLength, addDataToPacket);
GlurbHeadSegmentComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

const moveToEntity = (glurb: Entity, targetEntity: Entity): void => {
   const aiHelperComponent = AIHelperComponentArray.getComponent(glurb);
   
   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   const targetHitbox = targetTransformComponent.hitboxes[0];
   aiHelperComponent.moveFunc(glurb, targetHitbox.box.posX, targetHitbox.box.posY, 0);
   aiHelperComponent.turnFunc(glurb, targetHitbox.box.posX, targetHitbox.box.posY, 0, 0);
}

const getFollowTarget = (followAIComponent: FollowAI, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   const wantsToFollow = entityWantsToFollow(followAIComponent);

   let target: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];

      if (!InventoryUseComponentArray.hasComponent(entity)) {
         continue;
      }

      if (wantsToFollow) {
         target = entity;
         break;
      }
   }

   return target;
}

const getFoodTarget = (glurbHeadHitbox: Hitbox, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const moss = visibleEntities[i];
      if (getEntityType(moss) !== EntityType.moss) {
         continue;
      }

      const transformComponent = TransformComponentArray.getComponent(moss);
      const mossHitbox = transformComponent.hitboxes[0];
      const dist = distance(mossHitbox.box.posX, mossHitbox.box.posY, glurbHeadHitbox.box.posX, glurbHeadHitbox.box.posY);
      if (dist < minDist) {
         minDist = dist;
         target = moss;
      }
   }

   return target;
}

// @Cleanup: shares a bunch of logic with the functions in glurb-head-segment.ts
const getFinalSegment = (glurbSegment: Entity, foundSegments: Array<Entity>): Entity => {
   const transformComponent = TransformComponentArray.getComponent(glurbSegment);
   const hitbox = transformComponent.hitboxes[0];

   let nextSegment: Entity | undefined;
   const tethers = getHitboxTethers(hitbox);
   if (tethers !== undefined) {
      for (const tether of tethers) {
         const otherHitbox = tether.getOtherHitbox(hitbox);
         if (!foundSegments.includes(otherHitbox.entity)) {
            foundSegments.push(otherHitbox.entity);
            nextSegment = otherHitbox.entity;
         }
      }
   }

   if (nextSegment !== undefined) {
      return getFinalSegment(nextSegment, foundSegments);
   } else {
      return glurbSegment;
   }
}

// @Cleanup: shares a bunch of logic with the functions in glurb-head-segment.ts
const getNumSegments = (glurbSegment: Entity, foundSegments: Array<Entity>): number => {
   const transformComponent = TransformComponentArray.getComponent(glurbSegment);
   const hitbox = transformComponent.hitboxes[0];

   let nextSegment: Entity | undefined;
   const tethers = getHitboxTethers(hitbox);
   if (tethers !== undefined) {
      for (const tether of tethers) {
         const otherHitbox = tether.getOtherHitbox(hitbox);
         if (!foundSegments.includes(otherHitbox.entity)) {
            foundSegments.push(otherHitbox.entity);
            nextSegment = otherHitbox.entity;
         }
      }
   }

   if (nextSegment !== undefined) {
      return 1 + getNumSegments(nextSegment, foundSegments);
   } else {
      return 1;
   }
}

function onTick(glurbHead: Entity): void {
   // @SQUEAM
   if(1+1===2)return;
   
   const glurbHeadTransformComponent = TransformComponentArray.getComponent(glurbHead);
   const headHitbox = glurbHeadTransformComponent.hitboxes[0];
   
   const glurbHeadSegmentComponent = GlurbHeadSegmentComponentArray.getComponent(glurbHead);
   glurbHeadSegmentComponent.food -= 1 / (Vars.STOMACH_EMPTY_TIME_SECONDS * Settings.TICK_RATE);
   if (glurbHeadSegmentComponent.food < 0) {
      // @Temporary @Hack: glurbs are kinda shite right now at both spawning on moss and finding moss, so this is temp hack
      // if (getEntityAgeTicks(glurbHead) % (Settings.TICK_RATE * 5) === 0) {
      //    hitEntity(glurbHead, null, 1, DamageSource.arrow, AttackEffectiveness.effective, getRandomPositionInBox(headHitbox.box), 0);
      // }
      
      glurbHeadSegmentComponent.food = 0;
   }
   
   // Go to follow target if possible
   // @Copynpaste
   const tamingComponent = TamingComponentArray.getComponent(glurbHead);
   if (entityExists(tamingComponent.followTarget)) {
      moveToEntity(glurbHead, tamingComponent.followTarget);
      return;
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(glurbHead);
   
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(glurbHead);
   for (const pair of attackingEntitiesComponent.attackingEntities) {
      const attacker = pair[0];
      const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
      const attackerHitbox = attackerTransformComponent.hitboxes[0];

      // Run away!!
      const targetX = headHitbox.box.posX * 2 - attackerHitbox.box.posX;
      const targetY = headHitbox.box.posY * 2 - attackerHitbox.box.posY;
      aiHelperComponent.moveFunc(glurbHead, targetX, targetY, 0);
      aiHelperComponent.turnFunc(glurbHead, targetX, targetY, 0, 0);
      return;
   }
   
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.itemEntity) {
         const itemEntityComponent = ItemComponentArray.getComponent(entity);
         if (itemEntityComponent.item.type === ItemType.slurb){
            continue;
         }
         
         moveToEntity(glurbHead, entity);

         if (entitiesAreColliding(glurbHead, entity) !== CollisionVars.NO_COLLISION) {
            destroyEntity(entity);
         }
         
         return;
      }
   }

   // Consoom moss when hungry
   if (glurbHeadSegmentComponent.food < 0.6) {
      const targetMoss = getFoodTarget(headHitbox, aiHelperComponent.visibleEntities);
      if (targetMoss !== null) {
         moveToEntity(glurbHead, targetMoss);
         if (entitiesAreColliding(glurbHead, targetMoss) !== CollisionVars.NO_COLLISION) {
            destroyEntity(targetMoss);
            glurbHeadSegmentComponent.food += 0.5;

            const tickEvent: EntityTickEvent = {
               entityID: glurbHead,
               // @Hack
               type: EntityTickEventType.cowEat,
               data: 0
            };
            registerEntityTickEvent(glurbHead, tickEvent);

            const finalChild = getFinalSegment(glurbHead, []);
            if (getEntityType(finalChild) === EntityType.glurbBodySegment) {
               const glurbSegmentComponent = GlurbSegmentComponentArray.getComponent(finalChild);
               glurbSegmentComponent.mossBallCompleteness++;

               if (glurbSegmentComponent.mossBallCompleteness === 7) {
                  // Grow new segment

                  glurbSegmentComponent.mossBallCompleteness = 0;

                  const numSegments = getNumSegments(glurbHead, []);
                  assert(numSegments < glurbHeadSegmentComponent.maxNumSegments);

                  const finalSegmentTransformComponent = TransformComponentArray.getComponent(finalChild);
                  const finalSegmentHitbox = finalSegmentTransformComponent.hitboxes[0];

                  const spawnOffsetDirection = angle(finalSegmentHitbox.box.posX - headHitbox.box.posX, finalSegmentHitbox.box.posY - headHitbox.box.posY);
                  const spawnOffsetMagnitude = 30;
                  const x = finalSegmentHitbox.box.posX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
                  const y = finalSegmentHitbox.box.posY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
                  
                  let config: EntityConfig;
                  if (numSegments + 1 === glurbHeadSegmentComponent.maxNumSegments) {
                     // Tail segment
                     config = createGlurbTailSegmentConfig(x, y, randAngle());
                  } else {
                     // Body segment
                     config = createGlurbBodySegmentConfig(x, y, randAngle());
                  }

                  const newSegmentHitbox = getConfigTransformComponent(config.components).hitboxes[0];
                  tetherGlurbSegments(newSegmentHitbox, finalSegmentHitbox);
               }
            }
         }
         return;
      }
   }

   // Follow AI
   const followAI = aiHelperComponent.getFollowAI();
   updateFollowAIComponent(followAI, aiHelperComponent.visibleEntities, 7);

   if (entityExists(followAI.followTargetID)) {
      moveToEntity(glurbHead, followAI.followTargetID);
      return;
   } else {
      const followTarget = getFollowTarget(followAI, aiHelperComponent.visibleEntities);
      if (followTarget !== null) {
         // Follow the entity
         followAISetFollowTarget(followAI, followTarget, true);
         return;
      }
   }
   
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(glurbHead);
   if (wanderAI.targetPosition !== null) {
      aiHelperComponent.moveFunc(glurbHead, wanderAI.targetPosition.x, wanderAI.targetPosition.y, 0);
      aiHelperComponent.turnFunc(glurbHead, wanderAI.targetPosition.x, wanderAI.targetPosition.y, 0, 0);
   }
}