import { ServerComponentType } from "battletribes-shared/components";
import { BODY_GENERATION_RADIUS, GOLEM_WAKE_TIME_TICKS, GolemVars } from "../entities/mobs/golem";
import { ComponentArray } from "./ComponentArray";
import { DamageSource, Entity } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { randFloat, lerp, randInt, Point, polarVec2, randAngle } from "battletribes-shared/utils";
import { createPebblumConfig } from "../entities/mobs/pebblum";
import { PebblumComponentArray } from "./PebblumComponent";
import { TransformComponentArray } from "./TransformComponent";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { createEntity, destroyEntity, entityExists, getEntityLayer, getGameTicks } from "../world";
import { addLocalInvulnerabilityHash, canDamageEntity, damageEntity, HealthComponentArray } from "./HealthComponent";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { applyAccelerationFromGround, applyKnockback, Hitbox, turnHitboxToAngle } from "../hitboxes";

const enum Vars {
   TARGET_ENTITY_FORGET_TIME = 20,
   ROCK_SHIFT_INTERVAL = (0.225 * Settings.TICK_RATE) | 0
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
   
   for (const hitbox of hitboxes) {
      const box = hitbox.box as CircularBox;

      const offsetMagnitude = BODY_GENERATION_RADIUS * Math.random()
      const offsetDirection = randAngle();

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

export const GolemComponentArray = new ComponentArray<GolemComponent>(ServerComponentType.golem, true, getDataLength, addDataToPacket);
GolemComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
GolemComponentArray.onTakeDamage = onTakeDamage;
GolemComponentArray.onHitboxCollision = onHitboxCollision;

// @Incomplete?
// // Set initial hitbox positions (sleeping)
// for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
//    const rockInfo = golemComponent.rockInfoArray[i];
//    rockInfo.hitbox.offset.x = rockInfo.sleepOffsetX;
//    rockInfo.hitbox.offset.y = rockInfo.sleepOffsetY;
// }

const getTarget = (golemComponent: GolemComponent): Entity => {
   let mostDamage = 0;
   let mostDamagingEntity!: Entity;
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

const shiftRocks = (golem: Entity, golemComponent: GolemComponent): void => {
   for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
      const rockInfo = golemComponent.rockInfoArray[i];

      rockInfo.currentShiftTimerTicks++;
      if (rockInfo.currentShiftTimerTicks >= Vars.ROCK_SHIFT_INTERVAL) {
         rockInfo.lastOffsetX = rockInfo.targetOffsetX;
         rockInfo.lastOffsetY = rockInfo.targetOffsetY;
         const offsetMagnitude = randFloat(0, 3);
         const offsetDirection = randAngle();
         rockInfo.targetOffsetX = rockInfo.awakeOffsetX + offsetMagnitude * Math.sin(offsetDirection);
         rockInfo.targetOffsetY = rockInfo.awakeOffsetY + offsetMagnitude * Math.cos(offsetDirection);
         rockInfo.currentShiftTimerTicks = 0;
      }

      const shiftProgress = rockInfo.currentShiftTimerTicks / Vars.ROCK_SHIFT_INTERVAL;
      rockInfo.hitbox.box.offset.x = lerp(rockInfo.lastOffsetX, rockInfo.targetOffsetX, shiftProgress);
      rockInfo.hitbox.box.offset.y = lerp(rockInfo.lastOffsetY, rockInfo.targetOffsetY, shiftProgress);
   }

   const transformComponent = TransformComponentArray.getComponent(golem);
   transformComponent.isDirty = true;
}

const summonPebblums = (golem: Entity, golemComponent: GolemComponent, target: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(golem);
   const golemHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(golem);
   
   const numPebblums = randInt(2, 3);
   for (let i = 0; i < numPebblums; i++) {
      const offsetMagnitude = randFloat(200, 350);
      const offsetDirection = randAngle();
      const x = golemHitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = golemHitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
      
      const config = createPebblumConfig(new Point(x, y), randAngle());
      config.components[ServerComponentType.pebblum]!.targetEntityID = target;
      const pebblum = createEntity(config, layer, 0);
      
      golemComponent.summonedPebblumIDs.push(pebblum);
   }
}

const updateGolemHitboxPositions = (golem: Entity, golemComponent: GolemComponent, wakeProgress: number): void => {
   for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
      const rockInfo = golemComponent.rockInfoArray[i];

      rockInfo.hitbox.box.offset.x = lerp(rockInfo.sleepOffsetX, rockInfo.awakeOffsetX, wakeProgress);
      rockInfo.hitbox.box.offset.y = lerp(rockInfo.sleepOffsetY, rockInfo.awakeOffsetY, wakeProgress);
   }

   const transformComponent = TransformComponentArray.getComponent(golem);
   transformComponent.isDirty = true;
}

function onTick(golem: Entity): void {
   const golemComponent = GolemComponentArray.getComponent(golem);
   
   // Remove targets which are dead or have been out of aggro long enough
   // @Speed: Remove calls to Object.keys, Number, and hasOwnProperty
   // @Cleanup: Copy and paste from frozen-yeti
   for (const _targetID of Object.keys(golemComponent.attackingEntities)) {
      const targetID = Number(_targetID);

      const target = golemComponent.attackingEntities[targetID];
      if (typeof target === "undefined" || target.timeSinceLastAggro >= Vars.TARGET_ENTITY_FORGET_TIME) {
         delete golemComponent.attackingEntities[targetID];
      } else {
         target.timeSinceLastAggro += Settings.DT_S;
      }
   }

   if (Object.keys(golemComponent.attackingEntities).length === 0) {
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
   const golemHitbox = transformComponent.hitboxes[0];
   
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.hitboxes[0];

   const targetDir = golemHitbox.box.position.angleTo(targetHitbox.box.position);

   // Wake up
   if (golemComponent.wakeTimerTicks < GOLEM_WAKE_TIME_TICKS) {
      const wakeProgress = golemComponent.wakeTimerTicks / GOLEM_WAKE_TIME_TICKS;
      updateGolemHitboxPositions(golem, golemComponent, wakeProgress);
      
      golemComponent.wakeTimerTicks++;

      turnHitboxToAngle(golemHitbox, targetDir, Math.PI / 4, 0.5, false);
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

   applyAccelerationFromGround(golemHitbox, polarVec2(350, targetDir));

   turnHitboxToAngle(golemHitbox, targetDir, Math.PI / 1.5, 0.5, false);
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const golemComponent = GolemComponentArray.getComponent(entity);
   packet.writeNumber(golemComponent.wakeTimerTicks / GOLEM_WAKE_TIME_TICKS);
   packet.writeNumber(getGameTicks() - golemComponent.lastWakeTicks);
   packet.writeBool(golemComponent.wakeTimerTicks === GOLEM_WAKE_TIME_TICKS);
}

function onTakeDamage(golem: Entity, _hitHitbox: Hitbox, attackingEntity: Entity | null, _damageSource: DamageSource, damageTaken: number): void {
   // @Cleanup: Copy and paste from frozen-yeti

   if (attackingEntity === null || !HealthComponentArray.hasComponent(attackingEntity)) {
      return;
   }
   
   const golemComponent = GolemComponentArray.getComponent(golem);

   if (Object.keys(golemComponent.attackingEntities).length === 0) {
      golemComponent.lastWakeTicks = getGameTicks();
   }
   
   // Update/create the entity's targetInfo record
   if (golemComponent.attackingEntities.hasOwnProperty(attackingEntity)) {
      golemComponent.attackingEntities[attackingEntity].damageDealtToSelf += damageTaken;
      golemComponent.attackingEntities[attackingEntity].timeSinceLastAggro = 0;
   } else {
      golemComponent.attackingEntities[attackingEntity] = {
         damageDealtToSelf: damageTaken,
         timeSinceLastAggro: 0
      };
   }
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const golem = hitbox.entity;
   
   // Don't hurt entities which aren't attacking the golem
   const golemComponent = GolemComponentArray.getComponent(golem);
   if (!golemComponent.attackingEntities.hasOwnProperty(collidingEntity)) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "golem")) {
      return;
   }
   
   const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);

   // @Incomplete: Cause of death
   damageEntity(collidingHitbox, golem, 3, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingHitbox, polarVec2(300, hitDirection));
   addLocalInvulnerabilityHash(collidingEntity, "golem", 0.3);
}