import { CowSpecies, DamageSource, Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { getAbsAngleDiff, Point, positionIsInWorld, randAngle, randFloat, randInt, randItem, UtilVars } from "battletribes-shared/utils";
import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { ItemType } from "battletribes-shared/items/items";
import { registerEntityTickEvent } from "../server/player-clients";
import { getHitboxByFlag, TransformComponentArray } from "./TransformComponent";
import { createItemEntityConfig } from "../entities/item-entity";
import { Packet } from "battletribes-shared/packets";
import { getDistanceFromPointToEntity, willStopAtDesiredDistance } from "../ai-shared";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { BerryBushComponentArray } from "./BerryBushComponent";
import { damageEntity, healEntity, HealthComponentArray, hitEntityWithoutDamage } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { createGrassBlocker } from "../grass-blockers";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { createEntity, destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType, getGameTicks } from "../world";
import { getEntitiesAtPosition } from "../layer-utils";
import { getAvailableCarrySlot, mountCarrySlot, RideableComponentArray } from "./RideableComponent";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { addSkillLearningProgress, getRiderTargetPosition, TamingComponentArray } from "./TamingComponent";
import { TamingSkillID } from "../../../shared/src/taming";
import { CircularBox } from "../../../shared/src/boxes/CircularBox";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { addHitboxVelocity, applyKnockback, getHitboxVelocity, Hitbox } from "../hitboxes";
import { entityWantsToFollow, FollowAI, followAISetFollowTarget, updateFollowAIComponent } from "../ai/FollowAI";
import { runEscapeAI } from "../ai/EscapeAI";
import { HitboxFlag } from "../../../shared/src/boxes/boxes";

const enum Vars {
   SLOW_ACCELERATION = 200,
   SLOWMEDIUM_ACCELERATION = 350,
   MEDIUM_ACCELERATION = 500,
   FAST_ACCELERATION = 1150,
   
   MIN_GRAZE_COOLDOWN = 15 * Settings.TICK_RATE,
   MAX_GRAZE_COOLDOWN = 30 * Settings.TICK_RATE,
   MIN_POOP_PRODUCTION_COOLDOWN = 10 * Settings.TICK_RATE,
   MAX_POOP_PRODUCTION_COOLDOWN = 90 * Settings.TICK_RATE,
   GRAZE_TIME_TICKS = 2.5 * Settings.TICK_RATE,
   BERRY_FULLNESS_VALUE = 0.15,
   MIN_POOP_PRODUCTION_FULLNESS = 0.4,
   BOWEL_EMPTY_TIME_TICKS = 30 * Settings.TICK_RATE,
   MAX_BERRY_CHASE_FULLNESS = 0.8,
   // @Hack
   TURN_SPEED = 3.14159265358979,
   // Herd AI constants
   TURN_RATE = 0.4,
   MIN_SEPARATION_DISTANCE = 150,
   SEPARATION_INFLUENCE = 0.7,
   ALIGNMENT_INFLUENCE = 0.5,
   COHESION_INFLUENCE = 0.3,
   /** Angle that the head can be offset relative to the body */
   HEAD_DIRECTION_LEEWAY = 0.3,
   HEAD_TURN_SPEED = 0.75 * UtilVars.PI,

   RAM_COOLDOWN_TICKS = Settings.TICK_RATE * 2,
   RAM_CHARGE_TICKS = Settings.TICK_RATE,
   RAM_REST_TICKS = Settings.TICK_RATE * 0.6
}

const MAX_STAMINA = 10;
const STAMINA_USE_RATE = 2;
const STAMINA_REPLENISH_RATE = 1;

export class CowComponent {
   public readonly species: CowSpecies;
   public grazeProgressTicks = 0;
   public grazeCooldownTicks = 0;

   // For shaking berry bushes
   public targetBushID = 0;
   public bushShakeTimer = 0;

   /** Used when producing poop. */
   public bowelFullness = Math.random();
   public poopProductionCooldownTicks = randInt(Vars.MIN_POOP_PRODUCTION_COOLDOWN, Vars.MAX_POOP_PRODUCTION_COOLDOWN);

   // @Temporary
   public targetMovePosition: Point | null = null;

   // @Hack
   public targetGrass: Entity = 0;

   public isRamming = false;
   public ramStartTicks = 0;
   /** Remaining amount of ticks for which the cow will nost start a ram attack */
   public ramCooldownTicks: number;
   /** Remaining amount of ticks that the cow's ram attack has to charge up */
   public ramRemainingChargeTicks: number;
   /** Remaining amount of ticks that the cow has to rest after doing a ram attack. */
   public ramRestTicks: number;

   public stamina = MAX_STAMINA;

   constructor(species: CowSpecies) {
      this.species = species;
      this.ramCooldownTicks = Vars.RAM_COOLDOWN_TICKS;
      this.ramRemainingChargeTicks = Vars.RAM_CHARGE_TICKS;
      this.ramRestTicks = Vars.RAM_REST_TICKS;
   }
}

export const CowComponentArray = new ComponentArray<CowComponent>(ServerComponentType.cow, true, getDataLength, addDataToPacket);
CowComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
CowComponentArray.onHitboxCollision = onHitboxCollision;
CowComponentArray.onDeath = onDeath;

const poop = (cow: Entity, cowComponent: CowComponent): void => {
   // @SQUEAM
   if(1+1===2)return;
   
   cowComponent.poopProductionCooldownTicks = randInt(Vars.MIN_POOP_PRODUCTION_COOLDOWN, Vars.MAX_POOP_PRODUCTION_COOLDOWN);

   // Shit it out
   const transformComponent = TransformComponentArray.getComponent(cow);
   const bodyHitbox = transformComponent.hitboxes[0];
   const poopPosition = bodyHitbox.box.position.offset(randFloat(0, 16), randAngle());
   const config = createItemEntityConfig(poopPosition, randAngle(), ItemType.poop, 1, null);
   createEntity(config, getEntityLayer(cow), 0);

   // Let it out
   const event: EntityTickEvent<EntityTickEventType.cowFart> = {
      entityID: cow,
      type: EntityTickEventType.cowFart,
      data: 0
   };
   registerEntityTickEvent(cow, event);
}

const getTargetGrass = (cow: Entity): Entity | null => {
   // @SPEED!!!!

   const aiHelperComponent = AIHelperComponentArray.getComponent(cow);
   
   const transformComponent = TransformComponentArray.getComponent(cow);
   const cowHeadHitbox = getHitboxByFlag(transformComponent, HitboxFlag.COW_HEAD);
   if (cowHeadHitbox === null) {
      return null;
   }
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestGrassStrand: Entity | null = null;
   const grasses = new Array<Entity>();
   
   for (const chunk of aiHelperComponent.visibleChunks) {
      for (const entity of chunk.entities) {
         if (getEntityType(entity) === EntityType.grassStrand) {
            const grassTransformComponent = TransformComponentArray.getComponent(entity);
            const grassHitbox = grassTransformComponent.hitboxes[0];
            
            const dist = cowHeadHitbox.box.position.distanceTo(grassHitbox.box.position);

            grasses.push(entity);
            if (dist < minDist) {
               closestGrassStrand = entity;
               minDist = dist;
            }
         }
      }
   }

   // @SQUEAM so that cows don't get stuck going for grass on the other side of the fence
   if (Math.random() < 0.3) {
      if (grasses.length > 0) {
         return randItem(grasses);
      } else {
         return null;
      }
   }

   return closestGrassStrand;
}

const graze = (cow: Entity, cowComponent: CowComponent, targetGrass: Entity): void => {
   const cowTransformComponent = TransformComponentArray.getComponent(cow);
   const cowHeadHitbox = getHitboxByFlag(cowTransformComponent, HitboxFlag.COW_HEAD);
   if (cowHeadHitbox === null) {
      return;
   }

   const grassTransformComponent = TransformComponentArray.getComponent(targetGrass);
   const grassHitbox = grassTransformComponent.hitboxes[0];
   // const targetX = grassTransformComponent.position.x;
   // const targetY = grassTransformComponent.position.y;
   // const targetDirection = cowTransformComponent.position.angleTo(grassTransformComponent.position);
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(cow);
   aiHelperComponent.moveFunc(cow, grassHitbox.box.position, 150);
   aiHelperComponent.turnFunc(cow, grassHitbox.box.position, Math.PI, 0.4);

   const dist = cowHeadHitbox.box.position.distanceTo(grassHitbox.box.position);
   if (dist < 50) {
      // @SQUEAM so they can eat it befor ethey get jostled away in the pen shot
      // if (++cowComponent.grazeProgressTicks >= Vars.GRAZE_TIME_TICKS) {
         // 
         // Eat grass
         // 
   
         for (let i = 0; i < 4; i++) {
            const blockAmount = randFloat(0.6, 0.9);
            const position = grassHitbox.box.position.offset(randFloat(0, 12), randAngle());

            const blockerBox = new CircularBox(position, new Point(0, 0), 0, randFloat(12, 18));
            createGrassBlocker(blockerBox, getEntityLayer(cow), blockAmount, blockAmount, 0);
         }
         
         healEntity(cow, 3, cow);
         cowComponent.grazeCooldownTicks = randInt(Vars.MIN_GRAZE_COOLDOWN, Vars.MAX_GRAZE_COOLDOWN);
         cowComponent.bowelFullness = 1;
         cowComponent.targetGrass = 0;
      // }
   }
}

const findHerdMembers = (cowComponent: CowComponent, visibleEntities: ReadonlyArray<Entity>): ReadonlyArray<Entity> => {
   const herdMembers = new Array<Entity>();
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (getEntityType(entity) === EntityType.cow) {
         const otherCowComponent = CowComponentArray.getComponent(entity);
         if (otherCowComponent.species === cowComponent.species) {
            herdMembers.push(entity);
         }
      }
   }
   return herdMembers;
}

const chaseAndEatBerry = (cow: Entity, cowComponent: CowComponent, berryItemEntity: Entity): boolean => {
   if (entitiesAreColliding(cow, berryItemEntity) !== CollisionVars.NO_COLLISION) {
      eatBerry(cow, berryItemEntity, cowComponent);
      return true;
   }

   const berryTransformComponent = TransformComponentArray.getComponent(berryItemEntity);
   const berryHitbox = berryTransformComponent.hitboxes[0];

   const aiHelperComponent = AIHelperComponentArray.getComponent(cow);
   aiHelperComponent.moveFunc(cow, berryHitbox.box.position, Vars.MEDIUM_ACCELERATION);
   aiHelperComponent.turnFunc(cow, berryHitbox.box.position, Math.PI, 0.4);

   return false;
}

const entityIsHoldingBerry = (entity: Entity): boolean => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];

      const heldItem = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
      if (typeof heldItem !== "undefined" && heldItem.type === ItemType.berry) {
         return true;
      }
   }

   return false;
}

const getFollowTarget = (cow: Entity, followAI: FollowAI, visibleEntities: ReadonlyArray<Entity>): [Entity | null, boolean] => {
   const wantsToFollow = entityWantsToFollow(followAI);

   let currentTargetIsHoldingBerry = false;
   let target: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];

      if (!InventoryUseComponentArray.hasComponent(entity)) {
         continue;
      }

      const isHoldingBerry = entityIsHoldingBerry(entity);
      if (target === null && wantsToFollow && !isHoldingBerry) {
         target = entity;
      } else if (!currentTargetIsHoldingBerry && isHoldingBerry) {
         target = entity;
         currentTargetIsHoldingBerry = true;
      }
   }

   return [target, currentTargetIsHoldingBerry];
}

function onTick(cow: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(cow);
   const cowBodyHitbox = transformComponent.rootHitboxes[0];
   
   const cowComponent = CowComponentArray.getComponent(cow);

   if (cowComponent.poopProductionCooldownTicks > 0) {
      cowComponent.poopProductionCooldownTicks--;
   } else if (cowComponent.bowelFullness >= Vars.MIN_POOP_PRODUCTION_FULLNESS) {
      poop(cow, cowComponent);
   }

   cowComponent.bowelFullness -= 1 / Vars.BOWEL_EMPTY_TIME_TICKS;
   if (cowComponent.bowelFullness < 0) {
      cowComponent.bowelFullness = 0;
   }

   if (cowComponent.grazeCooldownTicks > 0) {
      cowComponent.grazeCooldownTicks--;
   }

   
   // @SQUEAM for the cow riding shot so they dont die while being ridden
   if (1+1===3) {
      // @Temporary: cuz shouldn't it use the energy system now?????
      if (cowComponent.bowelFullness === 0 && (getEntityAgeTicks(cow) + cow) % (2 * Settings.TICK_RATE) === 0) {
         damageEntity(cowBodyHitbox, null, 1, 0, AttackEffectiveness.effective, cowBodyHitbox.box.position.copy(), 0);
      }
   }
   
   // If the cow is recovering after doing a ram, just stand still and do nothing else
   if (cowComponent.ramRestTicks > 0) {
      cowComponent.ramRestTicks--;
      return;
   }

   const aiHelperComponent = AIHelperComponentArray.getComponent(cow);

   // - Copying the carried entities' acceleration is actually inaccurate in some cases if the carried
   //   entity isn't exactly on the thing being accelerated.
   // When something is riding the cow, that entity controls the cow's movement
   const rideableComponent = RideableComponentArray.getComponent(cow);
   const rider = rideableComponent.carrySlots[0].occupiedEntity;
   if (entityExists(rider)) {
      const targetPosition = getRiderTargetPosition(rider);
      if (targetPosition !== null) {
         // @SQUEAM
         const acceleration = Vars.FAST_ACCELERATION;
         // const acceleration = cowComponent.stamina > 0 ? Vars.FAST_ACCELERATION : Vars.SLOW_ACCELERATION;
         aiHelperComponent.moveFunc(cow, targetPosition, acceleration);
         aiHelperComponent.turnFunc(cow, targetPosition, Math.PI, 0.4);

         // Use stamina
         // @HACK this literally only works logically for 1 case
         cowComponent.stamina -= STAMINA_USE_RATE * Settings.DT_S;
         if (cowComponent.stamina < 0) {
            cowComponent.stamina = 0;
         }

         return;
      }
   }

   // Replenish stamina 
   // @HACK this literally only works logically for 1 case
   cowComponent.stamina += STAMINA_REPLENISH_RATE * Settings.DT_S;
   if (cowComponent.stamina > MAX_STAMINA) {
      cowComponent.stamina = MAX_STAMINA;
   }

   const escapeAI = aiHelperComponent.getEscapeAI();
   if (runEscapeAI(cow, aiHelperComponent, escapeAI)) {
      return;
   }

   // Go to follow target if possible
   // @Copynpaste
   const tamingComponent = TamingComponentArray.getComponent(cow);
   if (entityExists(tamingComponent.followTarget)) {
      const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.followTarget);
      const targetHitbox = targetTransformComponent.hitboxes[0];
      
      aiHelperComponent.moveFunc(cow, targetHitbox.box.position, Vars.SLOWMEDIUM_ACCELERATION);
      aiHelperComponent.turnFunc(cow, targetHitbox.box.position, Math.PI, 0.4);
      if (getEntityAgeTicks(cow) % Settings.TICK_RATE === 0) {
         addSkillLearningProgress(tamingComponent, TamingSkillID.move, 1);
      }
      return;
   }

   // Go to move target
   if (cowComponent.targetMovePosition !== null) {
      aiHelperComponent.moveFunc(cow, cowComponent.targetMovePosition, Vars.MEDIUM_ACCELERATION);
      aiHelperComponent.turnFunc(cow, cowComponent.targetMovePosition, Math.PI, 0.4);
      return;
   }

   // @Hack @Copynpaste
   // Pick up carry target
   if (entityExists(tamingComponent.carryTarget)) {
      const rideableComponent = RideableComponentArray.getComponent(cow);
      const carrySlot = getAvailableCarrySlot(rideableComponent);
      if (carrySlot !== null) {
         const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.carryTarget);
         const targetHitbox = targetTransformComponent.hitboxes[0];
         
         aiHelperComponent.moveFunc(cow, targetHitbox.box.position, Vars.MEDIUM_ACCELERATION);
         aiHelperComponent.turnFunc(cow, targetHitbox.box.position, Math.PI, 0.4);
         
         const targetDirection = cowBodyHitbox.box.position.angleTo(targetHitbox.box.position);

         // @INCOMPLETE @HACK: Cows shouldn't be able to pick up barrels themselves. It should require a tribesman to do it for them
         /* this is just a temporary hack cuz i haven't fleshed out any of these systems.
            Why they shouldn't be able to pick up barrels themselves:
            - doesn't make sense; they don't have the ability to
            - gameplay-wise, this means cows can kind of act as the full pipeline of thievery, not requiring tribesmen. A
              single tribesman with 10 cows works at equal efficiency as 10 tribesmen with 10 cows. Kind of removes the
              requirement of your workers as a way to wrangle your animals.
         */
         
         // Force carry if colliding and head is looking at the carry target
         const headHitbox = transformComponent.hitboxes[1];
         // (commented out the angle test cuz there were cases when teh head couldn't turn enough and got stuck on one direction on the barrel)
         // if (getAbsAngleDiff(headHitbox.box.angle, targetDirection) < 0.1 && entitiesAreColliding(cow, tamingComponent.carryTarget) !== CollisionVars.NO_COLLISION) {
         if (entitiesAreColliding(cow, tamingComponent.carryTarget) !== CollisionVars.NO_COLLISION) {
            mountCarrySlot(tamingComponent.carryTarget, carrySlot);
            tamingComponent.carryTarget = 0;
         }
         return;
      }
   }

   if (entityExists(tamingComponent.attackTarget)) {
      const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.attackTarget);
      const targetHitbox = targetTransformComponent.hitboxes[0];

      // Do the ram attack
      if (cowComponent.isRamming) {
         if (cowComponent.ramRemainingChargeTicks > 0) {
            cowComponent.ramRemainingChargeTicks--;
            // Turn towards the target
            aiHelperComponent.turnFunc(cow, targetHitbox.box.position, Math.PI, 0.4);
         } else {
            // Continue charging on straight in the head's current direction
            const cowHeadHitbox = transformComponent.hitboxes[1];
            const targetPos = cowBodyHitbox.box.position.offset(999, cowHeadHitbox.box.angle);
            aiHelperComponent.moveFunc(cow, targetPos, Vars.FAST_ACCELERATION);
            aiHelperComponent.turnFunc(cow, targetPos, Math.PI, 0.4);
         }
      } else {
         if (cowComponent.ramCooldownTicks > 0) {
            cowComponent.ramCooldownTicks--;
         }
         
         const dist = getDistanceFromPointToEntity(cowBodyHitbox.box.position, targetTransformComponent);
         
         if (willStopAtDesiredDistance(cowBodyHitbox, 130, dist)) {
            // If the cow is too close, move away
            // Turn to the target while moving backwards away from it
            const awayFromTarget = targetHitbox.box.position.angleTo(cowBodyHitbox.box.position);
            const awayPos = cowBodyHitbox.box.position.offset(999, awayFromTarget);
            // @Hack: acceleration (to counteract acceleration multiplier)
            aiHelperComponent.moveFunc(cow, awayPos, Vars.SLOWMEDIUM_ACCELERATION / 0.6);
            aiHelperComponent.turnFunc(cow, targetHitbox.box.position, Math.PI, 0.4);
         } else if (willStopAtDesiredDistance(cowBodyHitbox, 180, dist)) {
            // Within valid ram start range
            aiHelperComponent.turnFunc(cow, targetHitbox.box.position, Math.PI, 0.4);
            if (cowComponent.ramCooldownTicks === 0) {
               // If the ram attack isn't 
               const headHitbox = transformComponent.hitboxes[1];
               const targetDirection = headHitbox.box.position.angleTo(targetHitbox.box.position);
               if (getAbsAngleDiff(headHitbox.box.angle, targetDirection) < 0.1) {
                  // Start the ram attack
                  cowComponent.isRamming = true;
                  cowComponent.ramStartTicks = getGameTicks();
               }
            }
         } else {
            // If the cow isn't close enough, move towards the target
            aiHelperComponent.moveFunc(cow, targetHitbox.box.position, Vars.MEDIUM_ACCELERATION);
            aiHelperComponent.turnFunc(cow, targetHitbox.box.position, Math.PI, 0.4);
         }
      }
      return;
   }

   // Graze dirt to recover health
   if (cowComponent.bowelFullness < 0.3) {
      if (!entityExists(cowComponent.targetGrass) || (getEntityAgeTicks(cow) + cow * 2) % (Settings.TICK_RATE * 2) === 0) {
         const target = getTargetGrass(cow);
         if (target !== null) {
            cowComponent.targetGrass = target;
         }
      }

      if (entityExists(cowComponent.targetGrass)) {
         graze(cow, cowComponent, cowComponent.targetGrass);
         return;
      }
      // @Incomplete: Why is this here?
      cowComponent.grazeProgressTicks = 0;
   }

   const layer = getEntityLayer(cow);

   // Eat berries
   if (wantsToEatBerries(cowComponent)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const itemEntity = aiHelperComponent.visibleEntities[i];
         if (getEntityType(itemEntity) === EntityType.itemEntity) {
            const itemComponent = ItemComponentArray.getComponent(itemEntity);
            if (itemComponent.itemType === ItemType.berry) {
               const wasEaten = chaseAndEatBerry(cow, cowComponent, itemEntity);
               if (wasEaten) {
                  healEntity(cow, 3, cow);
                  break;
               }
               return;
            }
         }
      }
   }

   // Shake berries off berry bushes
   const healthComponent = HealthComponentArray.getComponent(cow);
   if (healthComponent.health < healthComponent.maxHealth) {
      // Attempt to find a berry bush
      if (!entityExists(cowComponent.targetBushID)) {
         let target: Entity | null = null;
         let minDistance = Number.MAX_SAFE_INTEGER;
         for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
            const berryBush = aiHelperComponent.visibleEntities[i];
            if (getEntityType(berryBush) !== EntityType.berryBush) {
               continue;
            }

            // Don't shake bushes without berries
            const berryBushComponent = BerryBushComponentArray.getComponent(berryBush);
            if (berryBushComponent.numBerries === 0) {
               continue;
            }

            const berryBushTransformComponent = TransformComponentArray.getComponent(berryBush);
            const berryBushHitbox = berryBushTransformComponent.hitboxes[0];
            
            const distance = cowBodyHitbox.box.position.distanceTo(berryBushHitbox.box.position);
            if (distance < minDistance) {
               minDistance = distance;
               target = berryBush;
            }
         }

         if (target !== null) {
            cowComponent.targetBushID = target;
         }
      }

      if (entityExists(cowComponent.targetBushID)) {
         const targetTransformComponent = TransformComponentArray.getComponent(cowComponent.targetBushID);
         const targetHitbox = targetTransformComponent.hitboxes[0];
         
         aiHelperComponent.moveFunc(cow, targetHitbox.box.position, Vars.SLOW_ACCELERATION);
         aiHelperComponent.turnFunc(cow, targetHitbox.box.position, Math.PI, 0.4);

         // If the target entity is directly in front of the cow, start eatin it
         const eatPositionX = cowBodyHitbox.box.position.x + 60 * Math.sin(cowBodyHitbox.box.angle);
         const eatPositionY = cowBodyHitbox.box.position.y + 60 * Math.cos(cowBodyHitbox.box.angle);
         if (positionIsInWorld(eatPositionX, eatPositionY)) {
            // @Hack? The only place which uses this weird function
            const testEntities = getEntitiesAtPosition(layer, eatPositionX, eatPositionY);
            if (testEntities.indexOf(cowComponent.targetBushID) !== -1) {
               cowComponent.bushShakeTimer++;
               if (cowComponent.bushShakeTimer >= 1.5 * Settings.TICK_RATE) {
                  const hitPosition = new Point(eatPositionX, eatPositionY);
                  hitEntityWithoutDamage(cowComponent.targetBushID, targetHitbox, cow, hitPosition);
                  cowComponent.bushShakeTimer = 0;
                  cowComponent.targetBushID = 0;
               }
            } else {
               cowComponent.bushShakeTimer = 0;
            }
         } else {
            cowComponent.bushShakeTimer = 0;
         }

         return;
      }
   }

   // Follow AI
   const followAI = aiHelperComponent.getFollowAI();
   updateFollowAIComponent(followAI, aiHelperComponent.visibleEntities, 7);

   if (entityExists(followAI.followTargetID)) {
      const targetTransformComponent = TransformComponentArray.getComponent(followAI.followTargetID);
      const targetHitbox = targetTransformComponent.hitboxes[0];
      
      aiHelperComponent.moveFunc(cow, targetHitbox.box.position, Vars.SLOW_ACCELERATION);
      aiHelperComponent.turnFunc(cow, targetHitbox.box.position, Math.PI, 0.4);
      return;
   } else {
      const [followTarget, isHoldingBerry] = getFollowTarget(cow, followAI, aiHelperComponent.visibleEntities);
      if (followTarget !== null) {
         // Follow the entity
         followAISetFollowTarget(followAI, followTarget, !isHoldingBerry);
         return;
      }
   }

   // Herd AI
   // @Incomplete: Steer the herd away from non-plains biomes
   // @SQUEAM cuz they b running into fences
   // const herdMembers = findHerdMembers(cowComponent, aiHelperComponent.visibleEntities);
   // if (herdMembers.length >= 2 && herdMembers.length <= 6) {
   //    runHerdAI(cow, herdMembers, aiHelperComponent.visionRange, Vars.TURN_RATE, Vars.MIN_SEPARATION_DISTANCE, Vars.SEPARATION_INFLUENCE, Vars.ALIGNMENT_INFLUENCE, Vars.COHESION_INFLUENCE);

   //    // @Incomplete: use new move func
   //    applyAccelerationFromGround(cowBodyHitbox, polarVec2(200, cowBodyHitbox.box.angle));
   //    return;
   // }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(cow);
   if (wanderAI.targetPosition !== null) {
      aiHelperComponent.moveFunc(cow, wanderAI.targetPosition, wanderAI.acceleration);
      aiHelperComponent.turnFunc(cow, wanderAI.targetPosition, wanderAI.turnSpeed, wanderAI.turnDamping);
   }
}

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const cowComponent = CowComponentArray.getComponent(entity);
   packet.writeNumber(cowComponent.species);
   packet.writeNumber(cowComponent.grazeProgressTicks > 0 ? cowComponent.grazeProgressTicks / Vars.GRAZE_TIME_TICKS : -1);
   packet.writeBool(cowComponent.isRamming);
   packet.writeNumber(cowComponent.stamina);
}

const eatBerry = (cow: Entity, berryItemEntity: Entity, cowComponent: CowComponent): void => {
   cowComponent.bowelFullness += Vars.BERRY_FULLNESS_VALUE;

   const itemComponent = ItemComponentArray.getComponent(berryItemEntity);
   if (itemComponent.throwingEntity !== null) {
      const tamingComponent = TamingComponentArray.getComponent(cow);
      tamingComponent.foodEatenInTier++;
   }

   destroyEntity(berryItemEntity);

   const tickEvent: EntityTickEvent = {
      entityID: cow,
      type: EntityTickEventType.cowEat,
      data: 0
   };
   registerEntityTickEvent(cow, tickEvent);
}

export function wantsToEatBerries(cowComponent: CowComponent): boolean {
   return cowComponent.bowelFullness <= Vars.MAX_BERRY_CHASE_FULLNESS;
}

const stopRamming = (cowComponent: CowComponent): void => {
   cowComponent.isRamming = false;
   cowComponent.ramCooldownTicks = Vars.RAM_COOLDOWN_TICKS;
   cowComponent.ramRemainingChargeTicks = Vars.RAM_CHARGE_TICKS;
   cowComponent.ramRestTicks = Vars.RAM_REST_TICKS;
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const cow = hitbox.entity;
   const cowComponent = CowComponentArray.getComponent(cow);
   if (!cowComponent.isRamming) {
      return;
   }

   const collidingEntity = collidingHitbox.entity;

   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   if (getHitboxVelocity(hitbox).magnitude() <= 100) {
      // If the cow is being blocked, stop the ram
      const ticksSinceRamStart = getGameTicks() - cowComponent.ramStartTicks;
      if (ticksSinceRamStart >= 1 * Settings.TICK_RATE) {
         stopRamming(cowComponent);
      }
      return;
   }

   const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);
   
   damageEntity(collidingHitbox, cow, 2, DamageSource.iceSpikes, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingHitbox, 180, hitDirection);

   stopRamming(cowComponent);

   // Slow the cow down as well
   const cowTransformComponent = TransformComponentArray.getComponent(cow);
   const cowBodyHitbox = cowTransformComponent.hitboxes[0];
   const cowVelocity = getHitboxVelocity(cowBodyHitbox);
   addHitboxVelocity(cowBodyHitbox, new Point(cowVelocity.x * -0.5, cowVelocity.y * -0.5));
}

function onDeath() {
   let numBad = 0;
   for (const cow of CowComponentArray.activeEntities) {
      const tamingComponent = TamingComponentArray.getComponent(cow)
      if (tamingComponent.name !== "") {
         numBad++;
      }
   }
}