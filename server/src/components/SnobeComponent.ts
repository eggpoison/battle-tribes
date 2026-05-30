import { Entity, EntityType, ServerComponentType, TileType, Settings, ItemType, Packet, DEFAULT_COLLISION_MASK, customTickIntervalHasPassed, getAbsAngleDiff, Point, polarVec2, randAngle, randFloat, randInt, randSign, secondsToTicks, EntityTickEvent, EntityTickEventType, distance, HitboxTag } from "battletribes-shared";
import { Bytes } from "../../../shared/src/constants.js";
import { runEscapeAI } from "../ai/EscapeAI.js";
import { AIHelperComponentArray } from "./AIHelperComponent.js";
import { ComponentArray } from "./ComponentArray.js";
import { createEntity, destroyEntity, entityExists, getEntityLayer, getEntityType } from "../world.js";
import { TransformComponent, TransformComponentArray } from "./TransformComponent.js";
import { addHitboxAngularAcceleration, addHitboxAngularVelocity, addHitboxVelocity, getHitboxAngularVelocity, getHitboxTag, getHitboxTile, Hitbox, teleportHitbox } from "../hitboxes.js";
import { SNOBE_EAR_IDEAL_ANGLE } from "../entities/tundra/snobe.js";
import { updateFollowAIComponent, entityWantsToFollow, followAISetFollowTarget, continueFollowingEntity } from "../ai/FollowAI.js";
import { ItemComponentArray } from "./ItemComponent.js";
import { CollisionVars, entitiesAreColliding } from "../collision-detection.js";
import { registerEntityTickEvent } from "../server/player-clients.js";
import { healEntity } from "./HealthComponent.js";
import { TamingComponentArray } from "./TamingComponent.js";
import { createSnowballConfig } from "../entities/snowball.js";
import { createSnobeMoundConfig } from "../entities/tundra/snobe-mound.js";
import { getConfigTransformComponent } from "../components.js";

const MIN_EAR_WIGGLE_COOLDOWN_TICKS = 1.5 * Settings.TICK_RATE;
const MAX_EAR_WIGGLE_COOLDOWN_TICKS = 5.5 * Settings.TICK_RATE;

/** Chance to want to dig per second */
const SNOW_DIG_CHANCE = 0.02;
const DIG_TIME_TICKS = secondsToTicks(2.5);

export class SnobeComponent {
   public isDigging = false;
   public ticksSpentDigging = 0;
   public diggingStartPosition = new Point(0, 0);
   public diggingMound: Entity = 0;
   
   public earWiggleCooldowns = [randInt(MIN_EAR_WIGGLE_COOLDOWN_TICKS, MAX_EAR_WIGGLE_COOLDOWN_TICKS), randInt(MIN_EAR_WIGGLE_COOLDOWN_TICKS, MAX_EAR_WIGGLE_COOLDOWN_TICKS)];
}

export const SnobeComponentArray = new ComponentArray<SnobeComponent>(ServerComponentType.snobe, true, getDataLength, addDataToPacket);
SnobeComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
}

const entityIsFollowable = (entity: Entity): boolean => {
   // @SQUEAM for the shot of snobes following a tuk
   // return getEntityType(entity) === EntityType.player;
   return getEntityType(entity) === EntityType.tukmok;
}

const getEarHitbox = (transformComponent: TransformComponent, i: number): Hitbox => {
   let currI = 0;
   for (const hitbox of transformComponent.hitboxes) {
      if (getHitboxTag(hitbox) === HitboxTag.snobeEar && currI++ === i) {
         return hitbox;
      }
   }

   throw new Error();
}

function onTick(snobe: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(snobe);
   const hitbox = transformComponent.hitboxes[0];

   const layer = getEntityLayer(snobe);

   const tileIndex = getHitboxTile(hitbox);
   const tileType = layer.getTileType(tileIndex);

   // Snobes move at normal speed on snow
   transformComponent.overrideMoveSpeedMultiplier = tileType === TileType.snow;

   const aiHelperComponent = AIHelperComponentArray.getComponent(snobe);

   // Go to follow target if possible
   // @Copynpaste
   const tamingComponent = TamingComponentArray.getComponent(snobe);
   if (entityExists(tamingComponent.followTarget)) {
      // @COPYNPASTE cuz we want to wiggle ears here as well
      // @ASS
      // When not in immediate danger, wiggle ears on occasion
      const snobeComponent = SnobeComponentArray.getComponent(snobe);
      for (let i = 0; i < 2; i++) {
         const earHitbox = getEarHitbox(transformComponent, i);

         const earWiggleCooldown = snobeComponent.earWiggleCooldowns[i];
         if (earWiggleCooldown <= 0) {
            addHitboxAngularVelocity(earHitbox, randFloat(1.35 * Math.PI, 1.75 * Math.PI) * randSign());
            
            snobeComponent.earWiggleCooldowns[i] = randInt(MIN_EAR_WIGGLE_COOLDOWN_TICKS, MAX_EAR_WIGGLE_COOLDOWN_TICKS);
         } else if (getAbsAngleDiff(earHitbox.box.relativeAngle, SNOBE_EAR_IDEAL_ANGLE) < 0.08) {
            snobeComponent.earWiggleCooldowns[i]--;
         }
      }
      
      const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.followTarget);
      const targetHitbox = targetTransformComponent.hitboxes[0];
      
      aiHelperComponent.turnFunc(snobe, targetHitbox.box.posX, targetHitbox.box.posY, 8 * Math.PI, 0.5);
      aiHelperComponent.moveFunc(snobe, targetHitbox.box.posX, targetHitbox.box.posY, 800);
      return;
   }

   const escapeAI = aiHelperComponent.getEscapeAI();
   if (runEscapeAI(snobe, aiHelperComponent, escapeAI)) {
      return;
   }

   // When not in immediate danger, wiggle ears on occasion
   const snobeComponent = SnobeComponentArray.getComponent(snobe);
   for (let i = 0; i < 2; i++) {
      const earHitbox = getEarHitbox(transformComponent, i);

      const earWiggleCooldown = snobeComponent.earWiggleCooldowns[i];
      if (earWiggleCooldown <= 0) {
         addHitboxAngularVelocity(earHitbox, randFloat(1.35 * Math.PI, 1.75 * Math.PI) * randSign());
         
         snobeComponent.earWiggleCooldowns[i] = randInt(MIN_EAR_WIGGLE_COOLDOWN_TICKS, MAX_EAR_WIGGLE_COOLDOWN_TICKS);
      } else if (getAbsAngleDiff(earHitbox.box.relativeAngle, SNOBE_EAR_IDEAL_ANGLE) < 0.08) {
         snobeComponent.earWiggleCooldowns[i]--;
      }
   }

   if (snobeComponent.isDigging) {
      if (snobeComponent.ticksSpentDigging < DIG_TIME_TICKS) {
         snobeComponent.ticksSpentDigging++;

         const progressSeconds = snobeComponent.ticksSpentDigging * Settings.DT_S;
         // minus pi/2 so that it starts on the come up
         let acceleration = 64 * Math.PI * Math.sin(progressSeconds * 28 - Math.PI/2);
         acceleration *= 0.2 + progressSeconds * 1.66;
         addHitboxAngularAcceleration(hitbox, acceleration);

         // Dig up snow when still digging
         if (customTickIntervalHasPassed(snobeComponent.ticksSpentDigging, 0.25)) {
            const offsetMag = randFloat(2, 8);
            const offsetDir = randAngle();
            const x = hitbox.box.posX + offsetMag * Math.sin(offsetDir);
            const y = hitbox.box.posY + offsetMag * Math.cos(offsetDir);
            const snowballConfig = createSnowballConfig(x, y, randAngle(), snobe, Math.random() < 0.75 ? 0 : 1);

            const snowballTransformComponent = getConfigTransformComponent(snowballConfig.components);
            const snowballHitbox = snowballTransformComponent.hitboxes[0];
            addHitboxVelocity(snowballHitbox, polarVec2(randFloat(50, 80), offsetDir + randFloat(0.1, 0.3) * randSign()))
            
            createEntity(snowballConfig, getEntityLayer(snobe), 0);
         }
      // When dug in, chance to pop back up after a while
      } else if (Math.random() < 0.1 * Settings.DT_S) {
         snobeComponent.isDigging = false;

         // Return the collision mask back to normal
         for (const hitbox of transformComponent.hitboxes) {
            hitbox.collisionMask |= DEFAULT_COLLISION_MASK;
         }

         if (entityExists(snobeComponent.diggingMound)) {
            destroyEntity(snobeComponent.diggingMound);
         }
      }

      // @HACK AAAAAAAAAAAAAAAAAA
      teleportHitbox(hitbox, snobeComponent.diggingStartPosition);

      return;
   }
   
   // Eat snowberries
   // @Copynpaste from yeti component
   {
      let minDist = Number.MAX_SAFE_INTEGER;
      let closestFoodItem: Entity | null = null;
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (getEntityType(entity) !== EntityType.itemEntity) {
            continue;
         }

         const itemComponent = ItemComponentArray.getComponent(entity);
         if (itemComponent.item.type === ItemType.snowberry) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = entityTransformComponent.hitboxes[0];
            
            const dist = distance(hitbox.box.posX, hitbox.box.posY, entityHitbox.box.posX, entityHitbox.box.posY);
            if (dist < minDist) {
               minDist = dist;
               closestFoodItem = entity;
            }
         }
      }
      if (closestFoodItem !== null) {
         const foodTransformComponent = TransformComponentArray.getComponent(closestFoodItem);
         const foodHitbox = foodTransformComponent.hitboxes[0];
         
         aiHelperComponent.turnFunc(snobe, foodHitbox.box.posX, foodHitbox.box.posY, 8 * Math.PI, 0.5);
         aiHelperComponent.moveFunc(snobe, foodHitbox.box.posX, foodHitbox.box.posY, 800);

         if (entitiesAreColliding(snobe, closestFoodItem) !== CollisionVars.NO_COLLISION) {
            healEntity(snobe, 3, snobe);
            destroyEntity(closestFoodItem);
            
            const tamingComponent = TamingComponentArray.getComponent(snobe);
            tamingComponent.foodEatenInTier++;

            // @Hack`
            const tickEvent: EntityTickEvent = {
               entityID: snobe,
               type: EntityTickEventType.cowEat,
               data: 0
            };
            registerEntityTickEvent(snobe, tickEvent);
         }
         return;
      }
   }

   // @COPYNPASTE
   const followAI = aiHelperComponent.getFollowAI();
   updateFollowAIComponent(followAI, aiHelperComponent.visibleEntities, 5);

   const followedEntity = followAI.followTargetID;
   if (entityExists(followedEntity)) {
      continueFollowingEntity(snobe, followAI, followedEntity, 1000, 8 * Math.PI, 0.5);
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

   if (Math.abs(getHitboxAngularVelocity(hitbox)) < 0.02 && Math.random() < SNOW_DIG_CHANCE * Settings.DT_S) {
      snobeComponent.isDigging = true;
      snobeComponent.ticksSpentDigging = 0;

      // @HACK: this is so bad, basically temporarily make the snobe not collide with any snowball.
      // ideally this would just be not colliding with snowballs the snobe has created
      for (const hitbox of transformComponent.hitboxes) {
         hitbox.collisionMask = 0;
      }

      snobeComponent.diggingStartPosition.x = hitbox.box.posX;
      snobeComponent.diggingStartPosition.y = hitbox.box.posY;

      // create the mound too
      const snobeMound = createSnobeMoundConfig(hitbox.box.posX, hitbox.box.posY, randAngle());
      snobeComponent.diggingMound = createEntity(snobeMound, getEntityLayer(snobe), 0);
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(snobe);
   if (wanderAI.targetPosition !== null) {
      aiHelperComponent.moveFunc(snobe, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.acceleration);
      aiHelperComponent.turnFunc(snobe, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.turnSpeed, wanderAI.turnDamping);
   }
}

function getDataLength(): number {
   return 2 * Bytes.Float32;
}

function addDataToPacket(packet: Packet, snobe: Entity): void {
   const snobeComponent = SnobeComponentArray.getComponent(snobe);
   packet.writeBool(snobeComponent.isDigging);

   const diggingProgress = snobeComponent.isDigging ? Math.min(snobeComponent.ticksSpentDigging / DIG_TIME_TICKS, 1) : 0;
   packet.writeNumber(diggingProgress);
}