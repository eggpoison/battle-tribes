import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType, DamageSource, SlimeSize } from "battletribes-shared/entities";
import { SLIME_MAX_MERGE_WANT, SLIME_MERGE_TIME, SLIME_MERGE_WEIGHTS, SLIME_RADII, SLIME_SPEED_MULTIPLIERS, SPIT_CHARGE_TIME_TICKS, SPIT_COOLDOWN_TICKS, SlimeEntityAnger, createSlimeConfig } from "../entities/mobs/slime";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { lerp, Point, polarVec2, randAngle, UtilVars } from "battletribes-shared/utils";
import { turnAngle, getEntitiesInRange, moveEntityToPosition } from "../ai-shared";
import { createSlimeSpitConfig } from "../entities/projectiles/slime-spit";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity, getEntityHealth, healEntity } from "./HealthComponent";
import { TransformComponentArray } from "./TransformComponent";
import { createEntity, destroyEntity, entityExists, entityIsFlaggedForDestruction, getEntityLayer, getEntityType, getGameTicks, tickIntervalHasPassed } from "../world";
import { Biome } from "../../../shared/src/biomes";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { applyAccelerationFromGround, getHitboxTile, Hitbox, turnHitboxToAngle, setHitboxVelocity } from "../hitboxes";

const enum Vars {
   TURN_SPEED = 2 * UtilVars.PI,
   ACCELERATION = 150,

   ANGER_DIFFUSE_MULTIPLIER = 0.15,

   // @Incomplete?
   MAX_ENTITIES_IN_RANGE_FOR_MERGE = 7,

   HEALING_ON_SLIME_PER_SECOND = 0.5,
   HEALING_PROC_INTERVAL = 0.1,

   MAX_ANGER_PROPAGATION_CHAIN_LENGTH = 5,
   MAX_ORBS = 10
}

interface AngerPropagationInfo {
   chainLength: number;
   readonly propagatedEntityIDs: Set<number>;
}

export class SlimeComponent {
   public readonly size: SlimeSize;

   /** The last tick that the slime spat at */
   public lastSpitTicks = 0;
   /** Progress in charging the spit attack in ticks */
   public spitChargeTicks = 0;
   
   public eyeAngle = randAngle();
   public mergeTimer = SLIME_MERGE_TIME;
   public mergeWeight: number;
   public lastMergeTicks: number;
   public readonly angeredEntities = new Array<SlimeEntityAnger>();

   public orbSizes = new Array<SlimeSize>();

   constructor(size: SlimeSize) {
      this.size = size;
      this.mergeWeight = SLIME_MERGE_WEIGHTS[size];
      this.lastMergeTicks = getGameTicks();
   }
}

const CONTACT_DAMAGE: ReadonlyArray<number> = [1, 2, 3];

export const SlimeComponentArray = new ComponentArray<SlimeComponent>(ServerComponentType.slime, true,  getDataLength, addDataToPacket);
SlimeComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
SlimeComponentArray.onHitboxCollision = onHitboxCollision;
SlimeComponentArray.onTakeDamage = onTakeDamage;

const updateAngerTarget = (slime: Entity): Entity | null => {
   const slimeComponent = SlimeComponentArray.getComponent(slime);

   // Target the entity which the slime is angry with the most
   let maxAnger = 0;
   let target: Entity;
   for (let i = 0; i < slimeComponent.angeredEntities.length; i++) {
      const angerInfo = slimeComponent.angeredEntities[i];

      // Remove anger at an entity if the entity is dead
      if (!entityExists(angerInfo.target)) {
         slimeComponent.angeredEntities.splice(i, 1);
         i--;
         continue;
      }

      // Decrease anger
      angerInfo.angerAmount -= Settings.DT_S * Vars.ANGER_DIFFUSE_MULTIPLIER;
      if (angerInfo.angerAmount <= 0) {
         slimeComponent.angeredEntities.splice(i, 1);
         i--;
         continue;
      }
      
      if (angerInfo.angerAmount > maxAnger) {
         maxAnger = angerInfo.angerAmount;
         target = angerInfo.target;
      }
   }

   if (maxAnger === 0) {
      return null;
   }
   
   return target!;
}

const createSpit = (slime: Entity, slimeComponent: SlimeComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const slimeHitbox = transformComponent.hitboxes[0];
   const x = slimeHitbox.box.position.x + SLIME_RADII[slimeComponent.size] * Math.sin(slimeHitbox.box.angle);
   const y = slimeHitbox.box.position.y + SLIME_RADII[slimeComponent.size] * Math.cos(slimeHitbox.box.angle);

   const config = createSlimeSpitConfig(new Point(x, y), randAngle(), slimeComponent.size === SlimeSize.large ? 1 : 0);

   const spitHitbox = config.components[ServerComponentType.transform]!.hitboxes[0];
   setHitboxVelocity(spitHitbox, 500 * Math.sin(slimeHitbox.box.angle), 500 * Math.cos(slimeHitbox.box.angle));

   createEntity(config, getEntityLayer(slime), 0);
}

// @Incomplete @Speed: Figure out why this first faster function seemingly gets called way less than the second one

const getEnemyChaseTargetID = (slime: Entity): number => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const slimeHitbox = transformComponent.hitboxes[0];
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime);
   const layer = getEntityLayer(slime);

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestEnemyID = 0;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const tileIndex = getHitboxTile(entityHitbox);
      
      const entityType = getEntityType(entity);
      if (entityType === EntityType.slime || entityType === EntityType.slimewisp || layer.tileBiomes[tileIndex] !== Biome.swamp || !HealthComponentArray.hasComponent(entity)) {
         continue;
      }

      const distanceSquared = slimeHitbox.box.position.calculateDistanceSquaredBetween(entityHitbox.box.position);
      if (distanceSquared < minDist) {
         minDist = distanceSquared;
         closestEnemyID = entity;
      }
   }

   return closestEnemyID;
}

const getChaseTargetID = (slime: Entity): number => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const slimeHitbox = transformComponent.hitboxes[0];
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime);
   const layer = getEntityLayer(slime);

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestEnemyID = 0;
   let closestMergerID = 0;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      const otherTransformComponent = TransformComponentArray.getComponent(entity);
      const otherHitbox = otherTransformComponent.hitboxes[0];

      if (getEntityType(entity) === EntityType.slime) {
         // Don't try to merge with larger slimes
         const otherSlimeComponent = SlimeComponentArray.getComponent(entity);
         if (!slimeWantsToMerge(otherSlimeComponent)) {
            continue;
         }

         const distanceSquared = slimeHitbox.box.position.calculateDistanceSquaredBetween(otherHitbox.box.position);
         if (distanceSquared < minDist) {
            minDist = distanceSquared;
            closestMergerID = entity;
         }
      } else {
         const tileIndex = getHitboxTile(otherHitbox);
         
         if (getEntityType(entity) === EntityType.slimewisp || layer.tileBiomes[tileIndex] !== Biome.swamp || !HealthComponentArray.hasComponent(entity)) {
            continue;
         }

         const distanceSquared = slimeHitbox.box.position.calculateDistanceSquaredBetween(otherHitbox.box.position);
         if (distanceSquared < minDist) {
            minDist = distanceSquared;
            closestEnemyID = entity;
         }
      }
   }

   if (closestEnemyID !== 0) {
      return closestEnemyID;
   }
   return closestMergerID;
}

const slimeWantsToMerge = (slimeComponent: SlimeComponent): boolean => {
   const mergeWant = getGameTicks() - slimeComponent.lastMergeTicks;
   return mergeWant >= SLIME_MAX_MERGE_WANT[slimeComponent.size];
}

function onTick(slime: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const slimeHitbox = transformComponent.hitboxes[0];

   const layer = getEntityLayer(slime);

   const tileIndex = getHitboxTile(slimeHitbox);
   const tileType = layer.getTileType(tileIndex);
   
   // Slimes move at normal speed on slime and sludge blocks
   transformComponent.overrideMoveSpeedMultiplier = tileType === TileType.slime || tileType === TileType.sludge;

   // Heal when standing on slime blocks
   if (tileType === TileType.slime) {
      if (tickIntervalHasPassed(Vars.HEALING_PROC_INTERVAL)) {
         healEntity(slime, Vars.HEALING_ON_SLIME_PER_SECOND * Vars.HEALING_PROC_INTERVAL, slime);
      }
   }

   const slimeComponent = SlimeComponentArray.getComponent(slime);

   // Attack entities the slime is angry at
   const angerTarget = updateAngerTarget(slime);
   if (angerTarget !== null) {
      const angerTargetTransformComponent = TransformComponentArray.getComponent(angerTarget);
      const targetHitbox = angerTargetTransformComponent.hitboxes[0];
      
      const targetDirection = slimeHitbox.box.position.angleTo(targetHitbox.box.position);
      slimeComponent.eyeAngle = turnAngle(slimeComponent.eyeAngle, targetDirection, 5 * Math.PI);

      turnHitboxToAngle(slimeHitbox, targetDirection, Vars.TURN_SPEED, 0.5, false);

      if (slimeComponent.size > SlimeSize.small) {
         // If it has been more than one tick since the slime has been angry, reset the charge progress
         if (slimeComponent.lastSpitTicks < getGameTicks() - 1) {
            slimeComponent.spitChargeTicks = 0;
         }
         slimeComponent.lastSpitTicks = getGameTicks();
         
         slimeComponent.spitChargeTicks++;
         if (slimeComponent.spitChargeTicks >= SPIT_COOLDOWN_TICKS) {
            // Spit attack
            if (slimeComponent.spitChargeTicks >= SPIT_CHARGE_TIME_TICKS) {
               createSpit(slime, slimeComponent);
               slimeComponent.spitChargeTicks = 0;
            }
            return;
         }
      }

      // @Hack
      const speedMultiplier = SLIME_SPEED_MULTIPLIERS[slimeComponent.size];
      applyAccelerationFromGround(slimeHitbox, polarVec2(Vars.ACCELERATION * speedMultiplier, slimeHitbox.box.angle));
      return;
   }

   // If the slime wants to merge, do a search for both merge and enemy targets. Otherwise only look for enemy targets
   let chaseTarget: number;
   if (slimeWantsToMerge(slimeComponent)) {
      // Chase enemies and merge targets
      chaseTarget = getChaseTargetID(slime);
   } else {
      // Chase enemies
      chaseTarget = getEnemyChaseTargetID(slime);
   }
   if (chaseTarget !== 0) {
      const chaseTargetTransformComponent = TransformComponentArray.getComponent(chaseTarget);
      const targetHitbox = chaseTargetTransformComponent.hitboxes[0];
      
      const targetDirection = slimeHitbox.box.position.angleTo(targetHitbox.box.position);
      slimeComponent.eyeAngle = turnAngle(slimeComponent.eyeAngle, targetDirection, 5 * Math.PI);

      const speedMultiplier = SLIME_SPEED_MULTIPLIERS[slimeComponent.size];
      applyAccelerationFromGround(slimeHitbox, polarVec2(Vars.ACCELERATION * speedMultiplier, slimeHitbox.box.angle));

      turnHitboxToAngle(slimeHitbox, targetDirection, Vars.TURN_SPEED, 0.5, false);
      return;
   }

   // Wander AI
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime);
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(slime);
   if (wanderAI.targetPosition !== null) {
      moveEntityToPosition(slime, wanderAI.targetPosition.x, wanderAI.targetPosition.y, 150 * SLIME_SPEED_MULTIPLIERS[slimeComponent.size], 2 * Math.PI, 1);
   }
}

function getDataLength(entity: Entity): number {
   const slimeComponent = SlimeComponentArray.getComponent(entity);

   let lengthBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT * slimeComponent.orbSizes.length;

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const slimeComponent = SlimeComponentArray.getComponent(entity);

   packet.writeNumber(slimeComponent.size);
   packet.writeNumber(slimeComponent.eyeAngle);
   
   let anger = -1;
   if (slimeComponent.angeredEntities.length > 0) {
      // Find maximum anger
      for (const angerInfo of slimeComponent.angeredEntities) {
         if (angerInfo.angerAmount > anger) {
            anger = angerInfo.angerAmount;
         }
      }
   }

   packet.writeNumber(anger);

   const spitChargeProgress = slimeComponent.spitChargeTicks >= SPIT_COOLDOWN_TICKS ? (slimeComponent.spitChargeTicks - SPIT_COOLDOWN_TICKS) / (SPIT_CHARGE_TIME_TICKS - SPIT_COOLDOWN_TICKS) : -1;
   packet.writeNumber(spitChargeProgress);

   packet.writeNumber(slimeComponent.orbSizes.length);
   for (let i = 0; i < slimeComponent.orbSizes.length; i++) {
      const orbSize = slimeComponent.orbSizes[i];
      packet.writeNumber(orbSize);
   }
}

const wantsToMerge = (slimeComponent1: SlimeComponent, slime2: Entity): boolean => {
   const slimeComponent2 = SlimeComponentArray.getComponent(slime2);
   
   // Don't try to merge with larger slimes
   if (slimeComponent1.size > slimeComponent2.size) return false;

   const mergeWant = getGameTicks() - slimeComponent1.lastMergeTicks;
   return mergeWant >= SLIME_MAX_MERGE_WANT[slimeComponent1.size];
}

const merge = (slime1: Entity, slime2: Entity): void => {
   // Prevents both slimes from calling this function
   if (entityIsFlaggedForDestruction(slime2)) return;

   const slimeComponent1 = SlimeComponentArray.getComponent(slime1);
   const slimeComponent2 = SlimeComponentArray.getComponent(slime2);
   slimeComponent1.mergeWeight += slimeComponent2.mergeWeight;

   slimeComponent1.mergeTimer = SLIME_MERGE_TIME;

   if (slimeComponent1.size < SlimeSize.large && slimeComponent1.mergeWeight >= SLIME_MERGE_WEIGHTS[slimeComponent1.size + 1]) {
      const orbSizes = new Array<SlimeSize>();

      // Add orbs from the 2 existing slimes
      for (const orbSize of slimeComponent1.orbSizes) {
         if (orbSizes.length < Vars.MAX_ORBS - 2) {
            orbSizes.push(orbSize);
         } else {
            break;
         }
      }
      for (const orbSize of slimeComponent2.orbSizes) {
         if (orbSizes.length < Vars.MAX_ORBS - 2) {
            orbSizes.push(orbSize);
         } else {
            break;
         }
      }

      // @Incomplete: Why do we do this for both?
      orbSizes.push(slimeComponent1.size);
      orbSizes.push(slimeComponent2.size);
      
      const slime1TransformComponent = TransformComponentArray.getComponent(slime1);
      const slime1Hitbox = slime1TransformComponent.hitboxes[0];
      const slime2TransformComponent = TransformComponentArray.getComponent(slime2);
      const slime2Hitbox = slime2TransformComponent.hitboxes[0];
      
      const x = (slime1Hitbox.box.position.x + slime2Hitbox.box.position.x) / 2;
      const y = (slime1Hitbox.box.position.y + slime2Hitbox.box.position.y) / 2;

      const config = createSlimeConfig(new Point(x, y), randAngle(), slimeComponent1.size + 1);
      config.components[ServerComponentType.slime]!.orbSizes = orbSizes;
      createEntity(config, getEntityLayer(slime1), 0);
      
      destroyEntity(slime1);
   } else {
      // @Incomplete: This allows small slimes to eat larger slimes. Very bad.
      
      // Add the other slime's health
      healEntity(slime1, getEntityHealth(slime2), slime1)

      if (slimeComponent1.orbSizes.length < Vars.MAX_ORBS) {
         slimeComponent1.orbSizes.push(slimeComponent2.size);
      }

      slimeComponent1.lastMergeTicks = getGameTicks();
   }
   
   destroyEntity(slime2);
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const slime = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   const collidingEntityType = getEntityType(collidingEntity);
   
   // Merge with slimes
   if (collidingEntityType === EntityType.slime) {
      const slimeComponent = SlimeComponentArray.getComponent(slime);
      if (wantsToMerge(slimeComponent, collidingEntity)) {
         slimeComponent.mergeTimer -= Settings.DT_S;
         if (slimeComponent.mergeTimer <= 0) {
            merge(slime, collidingEntity);
         }
      }
      return;
   }
   
   if (collidingEntityType === EntityType.slimewisp) return;
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "slime")) {
         return;
      }

      const slimeComponent = SlimeComponentArray.getComponent(slime);
      const damage = CONTACT_DAMAGE[slimeComponent.size];

      damageEntity(collidingHitbox, slime, damage, DamageSource.slime, AttackEffectiveness.effective, collisionPoint, 0);
      addLocalInvulnerabilityHash(collidingEntity, "slime", 0.3);
   }
}

const addEntityAnger = (slime: Entity, entity: Entity, amount: number, propagationInfo: AngerPropagationInfo): void => {
   const slimeComponent = SlimeComponentArray.getComponent(slime);

   let alreadyIsAngry = false;
   for (const entityAnger of slimeComponent.angeredEntities) {
      if (entityAnger.target === entity) {
         const angerOverflow = Math.max(entityAnger.angerAmount + amount - 1, 0);

         entityAnger.angerAmount = Math.min(entityAnger.angerAmount + amount, 1);

         if (angerOverflow > 0) {
            propagateAnger(slime, entity, angerOverflow, propagationInfo);
         }

         alreadyIsAngry = true;
         break;
      }
   }

   if (!alreadyIsAngry) {
      slimeComponent.angeredEntities.push({
         angerAmount: amount,
         target: entity
      });
   }
}

const propagateAnger = (slime: Entity, angeredEntity: Entity, amount: number, propagationInfo: AngerPropagationInfo = { chainLength: 0, propagatedEntityIDs: new Set() }): void => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime);

   const seeingHitbox = aiHelperComponent.seeingHitbox;
   
   const visionRange = aiHelperComponent.visionRange;
   // @Speed
   const layer = getEntityLayer(slime);
   const visibleEntities = getEntitiesInRange(layer, seeingHitbox.box.position.x, seeingHitbox.box.position.y, visionRange);

   // @Cleanup: don't do here
   let idx = visibleEntities.indexOf(slime);
   while (idx !== -1) {
      visibleEntities.splice(idx, 1);
      idx = visibleEntities.indexOf(slime);
   }
   
   // Propagate the anger
   for (const entity of visibleEntities) {
      if (getEntityType(entity) === EntityType.slime && !propagationInfo.propagatedEntityIDs.has(entity)) {
         const entityTransformComponent = TransformComponentArray.getComponent(entity);
         const entityHitbox = entityTransformComponent.hitboxes[0];
         
         const distance = seeingHitbox.box.position.distanceTo(entityHitbox.box.position);
         const distanceFactor = distance / visionRange;

         propagationInfo.propagatedEntityIDs.add(slime);
         
         propagationInfo.chainLength++;

         if (propagationInfo.chainLength <= Vars.MAX_ANGER_PROPAGATION_CHAIN_LENGTH) {
            const propogatedAnger = lerp(amount * 1, amount * 0.4, Math.sqrt(distanceFactor));
            addEntityAnger(entity, angeredEntity, propogatedAnger, propagationInfo);
         }

         propagationInfo.chainLength--;
      }
   }
}

function onTakeDamage(slime: Entity, _hitHitbox: Hitbox, attackingEntity: Entity | null): void {
   if (attackingEntity === null) {
      return;
   }
   
   const attackingEntityType = getEntityType(attackingEntity);
   if (attackingEntityType === EntityType.iceSpikes || attackingEntityType === EntityType.cactus) {
      return;
   }

   addEntityAnger(slime, attackingEntity, 1, { chainLength: 0, propagatedEntityIDs: new Set() });
   propagateAnger(slime, attackingEntity, 1);
}