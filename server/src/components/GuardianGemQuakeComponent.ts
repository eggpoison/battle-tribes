import { ServerComponentType } from "battletribes-shared/components";
import { Entity, DamageSource } from "battletribes-shared/entities";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import { destroyEntity, getEntityAgeTicks } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../hitboxes";

const enum Vars {
   TICKS_BEFORE_RECEED = (Settings.TICK_RATE * 0.2) | 0,
   LIFETIME_TICKS = (Settings.TICK_RATE * 0.6) | 0
}

export class GuardianGemQuakeComponent {}

export const GuardianGemQuakeComponentArray = new ComponentArray<GuardianGemQuakeComponent>(ServerComponentType.guardianGemQuake, true, getDataLength, addDataToPacket);
GuardianGemQuakeComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
},
GuardianGemQuakeComponentArray.onHitboxCollision = onHitboxCollision;

const getLife = (ageTicks: number): number => {
   return ageTicks < Vars.TICKS_BEFORE_RECEED ? 1 : 1 - (ageTicks - Vars.TICKS_BEFORE_RECEED) / (Vars.LIFETIME_TICKS - Vars.TICKS_BEFORE_RECEED);
}

function onTick(quake: Entity): void {
   const age = getEntityAgeTicks(quake);

   if (age >= Vars.TICKS_BEFORE_RECEED) {
      const life = getLife(age);
      
      const transformComponent = TransformComponentArray.getComponent(quake);
      const hitbox = transformComponent.hitboxes[0];
      hitbox.box.scale = life;
      transformComponent.isDirty = true;

      if (age >= Vars.LIFETIME_TICKS) {
         destroyEntity(quake);
      }
   }
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const guardian = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "gemQuake")) {
         return;
      }

      damageEntity(collidingHitbox, guardian, 2, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      addLocalInvulnerabilityHash(collidingEntity, "gemQuake", 0.3);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const age = getEntityAgeTicks(entity);
   const life = getLife(age);
   packet.writeNumber(life);
}