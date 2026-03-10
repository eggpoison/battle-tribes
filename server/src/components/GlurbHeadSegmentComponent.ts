import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { ItemType } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { assert, Point, randAngle } from "../../../shared/src/utils";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { Hitbox } from "../hitboxes";
import { destroyEntity, entityExists, getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { AttackingEntitiesComponentArray } from "./AttackingEntitiesComponent";
import { ComponentArray } from "./ComponentArray";
import { updateFollowAIComponent, followAISetFollowTarget, FollowAI, entityWantsToFollow } from "../ai/FollowAI";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { ItemComponentArray } from "./ItemComponent";
import { TamingComponentArray } from "./TamingComponent";
import { TransformComponentArray } from "./TransformComponent";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { EntityConfig, getConfigTransformComponent } from "../components";
import { createGlurbBodySegmentConfig } from "../entities/mobs/glurb-body-segment";
import { createGlurbTailSegmentConfig } from "../entities/mobs/glurb-tail-segment";
import { registerEntityTickEvent } from "../server/player-clients";
import { GlurbSegmentComponentArray } from "./GlurbSegmentComponent";
import { tetherGlurbSegments } from "../entities/mobs/glurb";

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
   aiHelperComponent.moveFunc(glurb, targetHitbox.box.position, 0);
   aiHelperComponent.turnFunc(glurb, targetHitbox.box.position, 0, 0);
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
      const dist = mossHitbox.box.position.distanceTo(glurbHeadHitbox.box.position);
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
   for (const tether of hitbox.tethers) {
      const otherHitbox = tether.getOtherHitbox(hitbox);
      if (!foundSegments.includes(otherHitbox.entity)) {
         foundSegments.push(otherHitbox.entity);
         nextSegment = otherHitbox.entity;
      }
   }

   if (typeof nextSegment !== "undefined") {
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
   for (const tether of hitbox.tethers) {
      const otherHitbox = tether.getOtherHitbox(hitbox);
      if (!foundSegments.includes(otherHitbox.entity)) {
         foundSegments.push(otherHitbox.entity);
         nextSegment = otherHitbox.entity;
      }
   }

   if (typeof nextSegment !== "undefined") {
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
      const targetX = headHitbox.box.position.x * 2 - attackerHitbox.box.position.x;
      const targetY = headHitbox.box.position.y * 2 - attackerHitbox.box.position.y;
      const targetPos = new Point(targetX, targetY);
      aiHelperComponent.moveFunc(glurbHead, targetPos, 0);
      aiHelperComponent.turnFunc(glurbHead, targetPos, 0, 0);
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

                  const spawnOffsetDirection = headHitbox.box.position.angleTo(finalSegmentHitbox.box.position);
                  const spawnOffsetMagnitude = 30;
                  const x = finalSegmentHitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
                  const y = finalSegmentHitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
                  
                  let config: EntityConfig;
                  if (numSegments + 1 === glurbHeadSegmentComponent.maxNumSegments) {
                     // Tail segment
                     config = createGlurbTailSegmentConfig(new Point(x, y), randAngle());
                  } else {
                     // Body segment
                     config = createGlurbBodySegmentConfig(new Point(x, y), randAngle());
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
      aiHelperComponent.moveFunc(glurbHead, wanderAI.targetPosition, 0);
      aiHelperComponent.turnFunc(glurbHead, wanderAI.targetPosition, 0, 0);
   }
}