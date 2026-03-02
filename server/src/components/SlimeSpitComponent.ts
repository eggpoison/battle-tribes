import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { createEntity, destroyEntity, getEntityLayer, getEntityType } from "../world";
import { TransformComponentArray } from "./TransformComponent";
import { createSpitPoisonAreaConfig } from "../entities/projectiles/spit-poison-area";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Settings } from "../../../shared/src/settings";
import { StatusEffect } from "../../../shared/src/status-effects";
import { Point, polarVec2, randAngle } from "../../../shared/src/utils";
import { HealthComponentArray, damageEntity } from "./HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent";
import { applyKnockback, getHitboxVelocity, Hitbox } from "../hitboxes";

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