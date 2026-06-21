import { moveEntityToPosition, runHerdAI } from "../ai-shared.js";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent.js";
import { runEscapeAI } from "../ai/EscapeAI.js";
import { updateFollowAIComponent, entityWantsToFollow, followAISetFollowTarget } from "../ai/FollowAI.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType, ticksToGameHours } from "../world.js";
import { applyAccelerationFromGround, getHitboxTile, hitboxIsStatic, turnHitboxToAngle } from "../hitboxes.js";
import { HealthComponentArray } from "./HealthComponent.js";
import { CollisionVars, entitiesAreColliding } from "../collision-detection.js";
import { addHungerEnergy, getEntityFullness } from "./EnergyStomachComponent.js";
import { EnergyStoreComponentArray } from "./EnergyStoreComponent.js";
import { runVegetationConsumeAI, shouldRunVegetationConsumeAI, updateVegetationConsumeAI } from "../ai/VegetationConsumeAI.js";
import { getKrumblidAttackTarget, getKrumblidDustfleaThreatTarget, runKrumblidCombatAI } from "../ai/KrumblidCombatAI.js";
import { runKrumblidHibernateAI } from "../ai/KrumblidHibernateAI.js";
import { addSkillLearningProgress, TamingComponentArray } from "./TamingComponent.js";
import { ItemComponentArray } from "./ItemComponent.js";
import { InventoryUseComponentArray } from "./InventoryUseComponent.js";
import { ComponentArray } from "./ComponentArray.js";
import { registerEntityTickEvent } from "../server/player-clients.js";
import { Biome } from "../../../shared/dist/biomes.js";
import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityType } from "../../../shared/dist/entities.js";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/dist/entity-events.js";
import { ItemType } from "../../../shared/dist/items/items.js";
import { Settings } from "../../../shared/dist/settings.js";
import { TamingSkillID } from "../../../shared/dist/taming.js";
import { UtilVar, distance, polarVec2 } from "../../../shared/dist/utils.js";

const enum Vars {
   TURN_SPEED = UtilVar.PI * 2
}

export class KrumblidComponent {}

export const KrumblidComponentArray = new ComponentArray<KrumblidComponent>(ServerComponentType.krumblid, true, getDataLength, addDataToPacket);
KrumblidComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const getTargetPricklyPear = (krumblid: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.hitboxes[0];
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (getEntityType(entity) !== EntityType.pricklyPear) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const dist = distance(hitbox.box.posX, hitbox.box.posY, entityHitbox.box.posX, entityHitbox.box.posY);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

const entityIsFollowable = (entity: Entity): boolean => {
   // Try to hide in cacti!
   if (getEntityType(entity) === EntityType.cactus) {
      return true;
   }
   
   if (!HealthComponentArray.hasComponent(entity)) {
      return false;
   }

   if (getEntityType(entity) === EntityType.krumblid) {
      return false;
   }

   if (!AIHelperComponentArray.hasComponent(entity)) {
      return false;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   if (hitboxIsStatic(hitbox)) {
      // So it isn't interested in trees n shit
      // @Incomplete: what about mobs which don't move? those should be interesting
      return false;
   }
   
   // Not interested in entities outside of the desert
   // @Incomplete: should be interested in entities oustide of the desert, just won't walk out of the desert!
   const entityTile = getHitboxTile(hitbox);
   const layer = getEntityLayer(entity);
   if (layer.getTileBiome(entityTile) !== Biome.desert) {
      return false;
   }
   
   return true;
}

// @Hack @COPYNPASTE from cow
const eatLeafItem = (krumblid: Entity, berryItemEntity: Entity): void => {
   addHungerEnergy(krumblid, 5);

   const itemComponent = ItemComponentArray.getComponent(berryItemEntity);
   if (itemComponent.throwingEntity !== null) {
      const tamingComponent = TamingComponentArray.getComponent(krumblid);
      tamingComponent.foodEatenInTier++;
   }

   destroyEntity(berryItemEntity);

   // @Hack`
   const tickEvent: EntityTickEvent = {
      entityID: krumblid,
      type: EntityTickEventType.cowEat,
      data: 0
   };
   registerEntityTickEvent(krumblid, tickEvent);
} 

// @Hack @COPYNPASTE from cow
const chaseAndEatLeafItem = (krumblid: Entity, berryItemEntity: Entity): boolean => {
   if (entitiesAreColliding(krumblid, berryItemEntity) !== CollisionVars.NO_COLLISION) {
      eatLeafItem(krumblid, berryItemEntity);
      return true;
   }

   const berryTransformComponent = TransformComponentArray.getComponent(berryItemEntity);
   const berryHitbox = berryTransformComponent.hitboxes[0];

   const targetX = berryHitbox.box.posX;
   const targetY = berryHitbox.box.posY;
   moveEntityToPosition(krumblid, targetX, targetY, 350, Vars.TURN_SPEED * 1.5, 0.4);

   return false;
}

// @Hack @COPYNPASTE from cow
const entityIsHoldingLeafItem = (entity: Entity): boolean => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];

      const heldItem = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
      if (heldItem !== undefined && heldItem.type === ItemType.leaf) {
         return true;
      }
   }

   return false;
}

function onTick(krumblid: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(krumblid);

   // By default, move the krumblids' mandibles back to their resting position
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   for (let i = 0; i < 2; i++) {
      const mandibleHitbox = transformComponent.hitboxes[i + 1];
      turnHitboxToAngle(mandibleHitbox, 0.1 * Math.PI, 3 * Math.PI, 0.5, true);
   }

   const tamingComponent = TamingComponentArray.getComponent(krumblid);
   if (tamingComponent.tamingTier >= 3 && getEntityAgeTicks(krumblid) % Settings.TICK_RATE === 0) {
      addSkillLearningProgress(tamingComponent, TamingSkillID.imprint, 1);
   }
   
   const escapeAI = aiHelperComponent.getEscapeAI();
   if (runEscapeAI(krumblid, aiHelperComponent, escapeAI)) {
      return;
   }
   
   const ageTicks = getEntityAgeTicks(krumblid);
   const ageHours = ticksToGameHours(ageTicks);
   if (ageHours >= 24) {
      const hibernateAI = aiHelperComponent.getKrumblidHibernateAI();
      runKrumblidHibernateAI(krumblid, aiHelperComponent, hibernateAI);
      return;
   }
   
   // @Hack @COPYNPASTE from cow
   // Eat leaf items
   if (getEntityFullness(krumblid) < 0.9) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const itemEntity = aiHelperComponent.visibleEntities[i];
         if (getEntityType(itemEntity) === EntityType.itemEntity) {
            const itemComponent = ItemComponentArray.getComponent(itemEntity);
            if (itemComponent.item.type === ItemType.leaf) {
               const wasEaten = chaseAndEatLeafItem(krumblid, itemEntity);
               if (!wasEaten) {
                  return;
               }
            }
         }
      }
   }

   // Eat prickly pears
   const fullness = getEntityFullness(krumblid);
   if (fullness < 0.5) {
      const targetPricklyPear = getTargetPricklyPear(krumblid, aiHelperComponent);
      if (targetPricklyPear !== null) {
         const targetTransformComponent = TransformComponentArray.getComponent(targetPricklyPear);
         // @Hack
         const targetHitbox = targetTransformComponent.hitboxes[0];
         
         moveEntityToPosition(krumblid, targetHitbox.box.posX, targetHitbox.box.posY, 250, Vars.TURN_SPEED, 1);
   
         if (entitiesAreColliding(krumblid, targetPricklyPear) !== CollisionVars.NO_COLLISION) {
            const energyStoreComponent = EnergyStoreComponentArray.getComponent(targetPricklyPear);
            addHungerEnergy(krumblid, energyStoreComponent.energyAmount);
            destroyEntity(targetPricklyPear);
         }
         return;
      }
   }

   // If there's a dustflea going towards the krumblid, turn towards it to try and munch it so that it doesn't slurp you
   const krumblidCombatAI = aiHelperComponent.getKrumblidCombatAI();
   const dustfleaThreat = getKrumblidDustfleaThreatTarget(krumblid, aiHelperComponent);
   if (dustfleaThreat !== null) {
      runKrumblidCombatAI(krumblid, aiHelperComponent, krumblidCombatAI, dustfleaThreat);
      return;
   }
   
   // Follow AI: Make the krumblid like to hide in cacti
   const followAI = aiHelperComponent.getFollowAI();
   updateFollowAIComponent(followAI, aiHelperComponent.visibleEntities, 5);

   const followedEntity = followAI.followTargetID;
   if (entityExists(followedEntity)) {
      const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
      // @Hack
      const followedEntityHitbox = followedEntityTransformComponent.hitboxes[0];
      
      // Continue following the entity
      moveEntityToPosition(krumblid, followedEntityHitbox.box.posX, followedEntityHitbox.box.posY, 250, Vars.TURN_SPEED, 1);
      return;
   } else if (entityWantsToFollow(followAI)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entityIsFollowable(entity)) {
            // Follow the entity
            followAISetFollowTarget(followAI, entity, true);
            // @Incomplete: movement isn't accounted for!
            return;
         }
      }
   }

   // Vegetation consume AI
   if (getEntityFullness(krumblid) < 0.5) {
      const vegetationConsumeAI = aiHelperComponent.getVegetationConsumeAI();
      updateVegetationConsumeAI(krumblid, aiHelperComponent, vegetationConsumeAI);
      if (shouldRunVegetationConsumeAI(vegetationConsumeAI)) {
         runVegetationConsumeAI(krumblid, aiHelperComponent, vegetationConsumeAI);
         return;
      }
   }

   // Eat dustfleas when low on food
   // (but prefer to eat them less than vegetation, so that krumblids don't crash the dustflea population)
   if (getEntityFullness(krumblid) < 0.5) {
      const eatTarget = getKrumblidAttackTarget(krumblid, aiHelperComponent);
      if (eatTarget !== null) {
         runKrumblidCombatAI(krumblid, aiHelperComponent, krumblidCombatAI, eatTarget);
         return;
      }
   }

   // Sand balling AI
   // something they do for fun
   // @TEMPORARY for shot
   // const sandBallingAI = aiHelperComponent.getSandBallingAI();
   // updateSandBallingAI(sandBallingAI);
   // if (shouldRunSandBallingAI(sandBallingAI)) {
   //    runSandBallingAI(krumblid, aiHelperComponent, sandBallingAI);
   //    return;
   // }

   // Herd AI
   // @Incomplete: Steer the herd away from non-plains biomes
   let herdMembers: Entity[] = [];
   for (const entity of aiHelperComponent.visibleEntities) {
      if (getEntityType(entity) === EntityType.krumblid) {
         herdMembers.push(entity);
      }
   }
   if (herdMembers.length >= 2 && herdMembers.length <= 6) {
      runHerdAI(krumblid, herdMembers, aiHelperComponent.visionRange, 2 * Math.PI, 50, 0.7, 0.5, 0.3);

      const hitbox = transformComponent.hitboxes[0];
      
      // @Incomplete: use new move func
      applyAccelerationFromGround(hitbox, polarVec2(200, hitbox.box.angle));
      return;
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(krumblid);
   if (wanderAI.targetPosition !== null) {
      aiHelperComponent.moveFunc(krumblid, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.acceleration);
      aiHelperComponent.turnFunc(krumblid, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.turnSpeed, wanderAI.turnDamping);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}