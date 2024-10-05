import { ServerComponentType } from "battletribes-shared/components";
import { BODY_GENERATION_RADIUS, GOLEM_WAKE_TIME_TICKS, GolemVars } from "../entities/mobs/golem";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { randFloat, lerp, randInt } from "battletribes-shared/utils";
import { stopEntity } from "../ai-shared";
import { createPebblumConfig } from "../entities/mobs/pebblum";
import { createEntityFromConfig } from "../Entity";
import { PebblumComponentArray } from "./PebblumComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { destroyEntity, entityExists, getEntityLayer, getGameTicks } from "../world";

const enum Vars {
   TARGET_ENTITY_FORGET_TIME = 20,
   ROCK_SHIFT_INTERVAL = (0.225 * Settings.TPS) | 0
}

export interface RockInfo {
   /** The hitbox corresponding to the rock info */
   readonly hitbox: Hitbox;
   readonly sleepOffsetX: number;
   readonly sleepOffsetY: number;
   readonly awakeOffsetX: number;
   readonly awakeOffsetY: number;
   lastOffsetX: number;
   lastOffsetY: number;
   targetOffsetX: number;
   targetOffsetY: number;
   currentShiftTimerTicks: number;
}

export interface GolemTargetInfo {
   damageDealtToSelf: number;
   timeSinceLastAggro: number;
}

const generateRockInfoArray = (hitboxes: ReadonlyArray<Hitbox>): Array<RockInfo> => {
   const rockInfoArray = new Array<RockInfo>();
   
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
      const box = hitbox.box as CircularBox;

      const offsetMagnitude = BODY_GENERATION_RADIUS * Math.random()
      const offsetDirection = 2 * Math.PI * Math.random();

      rockInfoArray.push({
         hitbox: hitbox,
         sleepOffsetX: offsetMagnitude * Math.sin(offsetDirection),
         sleepOffsetY: offsetMagnitude * Math.cos(offsetDirection),
         awakeOffsetX: box.offset.x,
         awakeOffsetY: box.offset.y,
         lastOffsetX: box.offset.x,
         lastOffsetY: box.offset.y,
         targetOffsetX: box.offset.x,
         targetOffsetY: box.offset.y,
         currentShiftTimerTicks: 0
      });
   }
   
   return rockInfoArray;
}

export class GolemComponent {
   public readonly rockInfoArray: Array<RockInfo>;
   public readonly attackingEntities: Record<number, GolemTargetInfo> = {};
   public wakeTimerTicks = 0;
   public lastWakeTicks = 0;

   public summonedPebblumIDs = new Array<number>();
   public pebblumSummonCooldownTicks: number;
   
   constructor(hitboxes: ReadonlyArray<Hitbox>, pebblumSummonCooldownTicks: number) {
      this.rockInfoArray = generateRockInfoArray(hitboxes);
      this.pebblumSummonCooldownTicks = pebblumSummonCooldownTicks;
   }
}

export const GolemComponentArray = new ComponentArray<GolemComponent>(ServerComponentType.golem, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

// @Incomplete?
// // Set initial hitbox positions (sleeping)
// for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
//    const rockInfo = golemComponent.rockInfoArray[i];
//    rockInfo.hitbox.offset.x = rockInfo.sleepOffsetX;
//    rockInfo.hitbox.offset.y = rockInfo.sleepOffsetY;
// }

const getTarget = (golemComponent: GolemComponent): EntityID => {
   let mostDamage = 0;
   let mostDamagingEntity!: EntityID;
   for (const _targetID of Object.keys(golemComponent.attackingEntities)) {
      const target = Number(_targetID);

      if (!entityExists(target)) {
         continue;
      }

      const damageDealt = golemComponent.attackingEntities[target].damageDealtToSelf;
      if (damageDealt > mostDamage) {
         mostDamage = damageDealt;
         mostDamagingEntity = target;
      }
   }
   return mostDamagingEntity;
}

const shiftRocks = (golem: EntityID, golemComponent: GolemComponent): void => {
   for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
      const rockInfo = golemComponent.rockInfoArray[i];

      rockInfo.currentShiftTimerTicks++;
      if (rockInfo.currentShiftTimerTicks >= Vars.ROCK_SHIFT_INTERVAL) {
         rockInfo.lastOffsetX = rockInfo.targetOffsetX;
         rockInfo.lastOffsetY = rockInfo.targetOffsetY;
         const offsetMagnitude = randFloat(0, 3);
         const offsetDirection = 2 * Math.PI * Math.random();
         rockInfo.targetOffsetX = rockInfo.awakeOffsetX + offsetMagnitude * Math.sin(offsetDirection);
         rockInfo.targetOffsetY = rockInfo.awakeOffsetY + offsetMagnitude * Math.cos(offsetDirection);
         rockInfo.currentShiftTimerTicks = 0;
      }

      const shiftProgress = rockInfo.currentShiftTimerTicks / Vars.ROCK_SHIFT_INTERVAL;
      rockInfo.hitbox.box.offset.x = lerp(rockInfo.lastOffsetX, rockInfo.targetOffsetX, shiftProgress);
      rockInfo.hitbox.box.offset.y = lerp(rockInfo.lastOffsetY, rockInfo.targetOffsetY, shiftProgress);
   }

   const physicsComponent = PhysicsComponentArray.getComponent(golem);
   physicsComponent.hitboxesAreDirty = true;
}

const summonPebblums = (golem: EntityID, golemComponent: GolemComponent, target: EntityID): void => {
   const transformComponent = TransformComponentArray.getComponent(golem);
   const layer = getEntityLayer(golem);
   
   const numPebblums = randInt(2, 3);
   for (let i = 0; i < numPebblums; i++) {
      const offsetMagnitude = randFloat(200, 350);
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
      
      const config = createPebblumConfig();
      config.components[ServerComponentType.transform].position.x = x;
      config.components[ServerComponentType.transform].position.y = y;
      config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config.components[ServerComponentType.pebblum].targetEntityID = target;
      const pebblum = createEntityFromConfig(config, layer, 0);
      
      golemComponent.summonedPebblumIDs.push(pebblum);
   }
}

const updateGolemHitboxPositions = (golem: EntityID, golemComponent: GolemComponent, wakeProgress: number): void => {
   for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
      const rockInfo = golemComponent.rockInfoArray[i];

      rockInfo.hitbox.box.offset.x = lerp(rockInfo.sleepOffsetX, rockInfo.awakeOffsetX, wakeProgress);
      rockInfo.hitbox.box.offset.y = lerp(rockInfo.sleepOffsetY, rockInfo.awakeOffsetY, wakeProgress);
   }

   const physicsComponent = PhysicsComponentArray.getComponent(golem);
   physicsComponent.hitboxesAreDirty = true;
}

function onTick(golemComponent: GolemComponent, golem: EntityID): void {
   // Remove targets which are dead or have been out of aggro long enough
   // @Speed: Remove calls to Object.keys, Number, and hasOwnProperty
   // @Cleanup: Copy and paste from frozen-yeti
   for (const _targetID of Object.keys(golemComponent.attackingEntities)) {
      const targetID = Number(_targetID);

      const target = golemComponent.attackingEntities[targetID];
      if (typeof target === "undefined" || target.timeSinceLastAggro >= Vars.TARGET_ENTITY_FORGET_TIME) {
         delete golemComponent.attackingEntities[targetID];
      } else {
         target.timeSinceLastAggro += Settings.I_TPS;
      }
   }

   if (Object.keys(golemComponent.attackingEntities).length === 0) {
      const physicsComponent = PhysicsComponentArray.getComponent(golem);
      stopEntity(physicsComponent);

      // Remove summoned pebblums
      for (let i = 0; i < golemComponent.summonedPebblumIDs.length; i++) {
         const pebblumID = golemComponent.summonedPebblumIDs[i];

         if (entityExists(pebblumID)) {
            destroyEntity(pebblumID);
         }
      }
      return;
   }

   const target = getTarget(golemComponent);

   // @Hack @Copynpaste: remove once the above guard works
   if (typeof target === "undefined") {
      const physicsComponent = PhysicsComponentArray.getComponent(golem);
      stopEntity(physicsComponent);

      // Remove summoned pebblums
      for (let i = 0; i < golemComponent.summonedPebblumIDs.length; i++) {
         const pebblumID = golemComponent.summonedPebblumIDs[i];

         if (entityExists(pebblumID)) {
            destroyEntity(pebblumID);
         }
      }
      return;
   }

   // Update summoned pebblums
   for (let i = 0; i < golemComponent.summonedPebblumIDs.length; i++) {
      const pebblumID = golemComponent.summonedPebblumIDs[i];
      if (!entityExists(pebblumID)) {
         golemComponent.summonedPebblumIDs.splice(i, 1);
         i--;
         continue;
      }

      const pebblumComponent = PebblumComponentArray.getComponent(pebblumID);
      pebblumComponent.targetEntityID = target;
   }

   const transformComponent = TransformComponentArray.getComponent(golem);
   const targetTransformComponent = TransformComponentArray.getComponent(target);

   const angleToTarget = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);

   // Wake up
   if (golemComponent.wakeTimerTicks < GOLEM_WAKE_TIME_TICKS) {
      const wakeProgress = golemComponent.wakeTimerTicks / GOLEM_WAKE_TIME_TICKS;
      updateGolemHitboxPositions(golem, golemComponent, wakeProgress);
      
      golemComponent.wakeTimerTicks++;

      const physicsComponent = PhysicsComponentArray.getComponent(golem);
      physicsComponent.targetRotation = angleToTarget;
      physicsComponent.turnSpeed = Math.PI / 4;
      return;
   }

   shiftRocks(golem, golemComponent);

   if (golemComponent.summonedPebblumIDs.length === 0) {
      if (golemComponent.pebblumSummonCooldownTicks > 0) {
         golemComponent.pebblumSummonCooldownTicks--;
      } else {
         summonPebblums(golem, golemComponent, target);
         golemComponent.pebblumSummonCooldownTicks = GolemVars.PEBBLUM_SUMMON_COOLDOWN_TICKS;
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(golem);

   physicsComponent.acceleration.x = 350 * Math.sin(angleToTarget);
   physicsComponent.acceleration.y = 350 * Math.cos(angleToTarget);

   physicsComponent.targetRotation = angleToTarget;
   physicsComponent.turnSpeed = Math.PI / 1.5;
}

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const golemComponent = GolemComponentArray.getComponent(entity);

   packet.addNumber(golemComponent.wakeTimerTicks / GOLEM_WAKE_TIME_TICKS);
   packet.addNumber(getGameTicks() - golemComponent.lastWakeTicks);
   packet.addBoolean(golemComponent.wakeTimerTicks === GOLEM_WAKE_TIME_TICKS);
   packet.padOffset(3);
}