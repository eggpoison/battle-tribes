import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType, SlimeSize } from "battletribes-shared/entities";
import { SLIME_MAX_MERGE_WANT, SLIME_MERGE_TIME, SLIME_MERGE_WEIGHTS, SLIME_RADII, SLIME_SPEED_MULTIPLIERS, SPIT_CHARGE_TIME_TICKS, SPIT_COOLDOWN_TICKS, SlimeEntityAnger } from "../entities/mobs/slime";
import Layer from "../Layer";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { Biome, TileType } from "battletribes-shared/tiles";
import { UtilVars } from "battletribes-shared/utils";
import { turnAngle, stopEntity } from "../ai-shared";
import { createSlimeSpitConfig } from "../entities/projectiles/slime-spit";
import { createEntityFromConfig } from "../Entity";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { HealthComponentArray, healEntity } from "./HealthComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray, getEntityTile } from "./TransformComponent";
import { entityExists, getEntityLayer, getEntityType, getGameTicks } from "../world";

const enum Vars {
   TURN_SPEED = 2 * UtilVars.PI,
   ACCELERATION = 150,

   ANGER_DIFFUSE_MULTIPLIER = 0.15,

   // @Incomplete?
   MAX_ENTITIES_IN_RANGE_FOR_MERGE = 7,

   HEALING_ON_SLIME_PER_SECOND = 0.5,
   HEALING_PROC_INTERVAL = 0.1
}


export interface SlimeComponentParams {
   size: SlimeSize;
   mergeWeight: number;
   orbSizes: Array<SlimeSize>;
}

export class SlimeComponent {
   public readonly size: SlimeSize;

   /** The last tick that the slime spat at */
   public lastSpitTicks = 0;
   /** Progress in charging the spit attack in ticks */
   public spitChargeTicks = 0;
   
   public eyeRotation = 2 * Math.PI * Math.random();
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

export const SlimeComponentArray = new ComponentArray<SlimeComponent>(ServerComponentType.slime, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const updateAngerTarget = (slime: EntityID): EntityID | null => {
   const slimeComponent = SlimeComponentArray.getComponent(slime);

   // Target the entity which the slime is angry with the most
   let maxAnger = 0;
   let target: EntityID;
   for (let i = 0; i < slimeComponent.angeredEntities.length; i++) {
      const angerInfo = slimeComponent.angeredEntities[i];

      // Remove anger at an entity if the entity is dead
      if (!entityExists(angerInfo.target)) {
         slimeComponent.angeredEntities.splice(i, 1);
         i--;
         continue;
      }

      // Decrease anger
      angerInfo.angerAmount -= Settings.I_TPS * Vars.ANGER_DIFFUSE_MULTIPLIER;
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

const createSpit = (slime: EntityID, slimeComponent: SlimeComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const x = transformComponent.position.x + SLIME_RADII[slimeComponent.size] * Math.sin(transformComponent.rotation);
   const y = transformComponent.position.y + SLIME_RADII[slimeComponent.size] * Math.cos(transformComponent.rotation);

   const config = createSlimeSpitConfig(slimeComponent.size === SlimeSize.large ? 1 : 0);
   config.components[ServerComponentType.transform].position.x = x;
   config.components[ServerComponentType.transform].position.y = y;
   config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   config.components[ServerComponentType.physics].selfVelocity.x = 500 * Math.sin(transformComponent.rotation);
   config.components[ServerComponentType.physics].selfVelocity.y = 500 * Math.cos(transformComponent.rotation);
   createEntityFromConfig(config, getEntityLayer(slime), 0);
}

// @Incomplete @Speed: Figure out why this first faster function seemingly gets called way less than the second one

const getEnemyChaseTargetID = (slime: EntityID): number => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime);
   const layer = getEntityLayer(slime);

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestEnemyID = 0;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      const entityTransformComponent = TransformComponentArray.getComponent(entity);

      const tileIndex = getEntityTile(entityTransformComponent);
      
      const entityType = getEntityType(entity);
      if (entityType === EntityType.slime || entityType === EntityType.slimewisp || layer.tileBiomes[tileIndex] !== Biome.swamp || !HealthComponentArray.hasComponent(entity)) {
         continue;
      }

      const distanceSquared = transformComponent.position.calculateDistanceSquaredBetween(entityTransformComponent.position);
      if (distanceSquared < minDist) {
         minDist = distanceSquared;
         closestEnemyID = entity;
      }
   }

   return closestEnemyID;
}

const getChaseTargetID = (slime: EntityID): number => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime);
   const layer = getEntityLayer(slime);

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestEnemyID = 0;
   let closestMergerID = 0;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      const otherTransformComponent = TransformComponentArray.getComponent(entity);

      if (getEntityType(entity) === EntityType.slime) {
         // Don't try to merge with larger slimes
         const otherSlimeComponent = SlimeComponentArray.getComponent(entity);
         if (!slimeWantsToMerge(otherSlimeComponent)) {
            continue;
         }

         const distanceSquared = transformComponent.position.calculateDistanceSquaredBetween(otherTransformComponent.position);
         if (distanceSquared < minDist) {
            minDist = distanceSquared;
            closestMergerID = entity;
         }
      } else {
         const tileIndex = getEntityTile(otherTransformComponent);
         
         if (getEntityType(entity) === EntityType.slimewisp || layer.tileBiomes[tileIndex] !== Biome.swamp || !HealthComponentArray.hasComponent(entity)) {
            continue;
         }

         const distanceSquared = transformComponent.position.calculateDistanceSquaredBetween(otherTransformComponent.position);
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

function onTick(slimeComponent: SlimeComponent, slime: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const layer = getEntityLayer(slime);

   const tileIndex = getEntityTile(transformComponent);
   const tileType = layer.tileTypes[tileIndex];
   
   // Slimes move at normal speed on slime and sludge blocks
   const physicsComponent = PhysicsComponentArray.getComponent(slime);
   physicsComponent.overrideMoveSpeedMultiplier = tileType === TileType.slime || tileType === TileType.sludge;

   // Heal when standing on slime blocks
   if (tileType === TileType.slime) {
      if (Layer.tickIntervalHasPassed(Vars.HEALING_PROC_INTERVAL)) {
         healEntity(slime, Vars.HEALING_ON_SLIME_PER_SECOND * Vars.HEALING_PROC_INTERVAL, slime);
      }
   }

   // Attack entities the slime is angry at
   const angerTarget = updateAngerTarget(slime);
   if (angerTarget !== null) {
      const angerTargetTransformComponent = TransformComponentArray.getComponent(angerTarget);
      
      const targetDirection = transformComponent.position.calculateAngleBetween(angerTargetTransformComponent.position);
      slimeComponent.eyeRotation = turnAngle(slimeComponent.eyeRotation, targetDirection, 5 * Math.PI);

      physicsComponent.targetRotation = targetDirection;
      physicsComponent.turnSpeed = Vars.TURN_SPEED;

      if (slimeComponent.size > SlimeSize.small) {
         // If it has been more than one tick since the slime has been angry, reset the charge progress
         if (slimeComponent.lastSpitTicks < getGameTicks() - 1) {
            slimeComponent.spitChargeTicks = 0;
         }
         slimeComponent.lastSpitTicks = getGameTicks();
         
         slimeComponent.spitChargeTicks++;
         if (slimeComponent.spitChargeTicks >= SPIT_COOLDOWN_TICKS) {
            stopEntity(physicsComponent);
            
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
      physicsComponent.acceleration.x = Vars.ACCELERATION * speedMultiplier * Math.sin(transformComponent.rotation);
      physicsComponent.acceleration.y = Vars.ACCELERATION * speedMultiplier * Math.cos(transformComponent.rotation);
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
      
      const targetDirection = transformComponent.position.calculateAngleBetween(chaseTargetTransformComponent.position);
      slimeComponent.eyeRotation = turnAngle(slimeComponent.eyeRotation, targetDirection, 5 * Math.PI);

      const speedMultiplier = SLIME_SPEED_MULTIPLIERS[slimeComponent.size];
      physicsComponent.acceleration.x = Vars.ACCELERATION * speedMultiplier * Math.sin(transformComponent.rotation);
      physicsComponent.acceleration.y = Vars.ACCELERATION * speedMultiplier * Math.cos(transformComponent.rotation);

      physicsComponent.targetRotation = targetDirection;
      physicsComponent.turnSpeed = Vars.TURN_SPEED;
      return;
   }

   // Wander AI
   const aiHelperComponent = AIHelperComponentArray.getComponent(slime);
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.run(slime);
}

function getDataLength(entity: EntityID): number {
   const slimeComponent = SlimeComponentArray.getComponent(entity);

   let lengthBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT * slimeComponent.orbSizes.length;

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const slimeComponent = SlimeComponentArray.getComponent(entity);

   packet.addNumber(slimeComponent.size);
   packet.addNumber(slimeComponent.eyeRotation);
   
   let anger = -1;
   if (slimeComponent.angeredEntities.length > 0) {
      // Find maximum anger
      for (const angerInfo of slimeComponent.angeredEntities) {
         if (angerInfo.angerAmount > anger) {
            anger = angerInfo.angerAmount;
         }
      }
   }

   packet.addNumber(anger);

   const spitChargeProgress = slimeComponent.spitChargeTicks >= SPIT_COOLDOWN_TICKS ? (slimeComponent.spitChargeTicks - SPIT_COOLDOWN_TICKS) / (SPIT_CHARGE_TIME_TICKS - SPIT_COOLDOWN_TICKS) : -1;
   packet.addNumber(spitChargeProgress);

   packet.addNumber(slimeComponent.orbSizes.length);
   for (let i = 0; i < slimeComponent.orbSizes.length; i++) {
      const orbSize = slimeComponent.orbSizes[i];
      packet.addNumber(orbSize);
   }
}