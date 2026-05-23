import { ServerComponentType, Entity, EntityType, DamageSource, Packet, AttackEffectiveness, Settings, StatusEffect, Point, polarVec2, randAngle } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";
import { createEntity, destroyEntity, getEntityLayer, getEntityType } from "../world.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { createSpitPoisonAreaConfig } from "../entities/projectiles/spit-poison-area.js";
import { HealthComponentArray, damageEntity } from "./HealthComponent.js";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent.js";
import { applyKnockback, getHitboxVelocity, Hitbox } from "../hitboxes.js";

const enum Vars {
   BREAK_VELOCITY = 100
}

export class SlimeSpitComponent {
   public readonly size: number;

   constructor(size: number) {
      this.size = size;
   }
}

export const SlimeSpitComponentArray = new ComponentArray<SlimeSpitComponent>(ServerComponentType.slimeSpit, true, getDataLength, addDataToPacket);
SlimeSpitComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
SlimeSpitComponentArray.onHitboxCollision = onHitboxCollision;
SlimeSpitComponentArray.preRemove = preRemove;

function onTick(spit: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(spit);
   const hitbox = transformComponent.hitboxes[0];
   if (getHitboxVelocity(hitbox).magnitude() <= Vars.BREAK_VELOCITY) {
      destroyEntity(spit);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(entity);
   packet.writeNumber(slimeSpitComponent.size);
}

function preRemove(spit: Entity): void {
   const spitComponent = SlimeSpitComponentArray.getComponent(spit);
   if (spitComponent.size === 1) {
      const transformComponent = TransformComponentArray.getComponent(spit);
      const spitHitbox = transformComponent.hitboxes[0];

      const config = createSpitPoisonAreaConfig(spitHitbox.box.position.copy(), randAngle());
      createEntity(config, getEntityLayer(spit), 0);
   }
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.slime || collidingEntityType === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const spit = hitbox.entity;

   const spitComponent = SlimeSpitComponentArray.getComponent(spit);
   const damage = spitComponent.size === 0 ? 2 : 3;

   const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);

   damageEntity(collidingHitbox, spit, damage, DamageSource.poison, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingHitbox, polarVec2(150, hitDirection));
   
   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 2 * Settings.TICK_RATE);
   }

   destroyEntity(spit);
}