import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { DamageSource, Entity } from "battletribes-shared/entities";
import { moveEntityToPosition } from "../ai-shared";
import { TransformComponentArray } from "./TransformComponent";
import { Point, polarVec2, UtilVars } from "battletribes-shared/utils";
import { entityExists } from "../world";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback, Hitbox } from "../hitboxes";

const enum Vars {
   TURN_SPEED = UtilVars.PI * 2
}

export class PebblumComponent {
   public targetEntityID: number;
   
   constructor(targetEntity: Entity) {
      this.targetEntityID = targetEntity;
   }
}

export const PebblumComponentArray = new ComponentArray<PebblumComponent>(ServerComponentType.pebblum, true, getDataLength, addDataToPacket);
PebblumComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
PebblumComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(pebblum: Entity): void {
   const pebblumComponent = PebblumComponentArray.getComponent(pebblum);
   
   const target = pebblumComponent.targetEntityID;
   if (entityExists(target)) {
      const targetTransformComponent = TransformComponentArray.getComponent(target);
      const targetHitbox = targetTransformComponent.hitboxes[0];

      moveEntityToPosition(pebblum, targetHitbox.box.position.x, targetHitbox.box.position.y, 850, Vars.TURN_SPEED, 1);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const pebblum = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   const pebblumComponent = PebblumComponentArray.getComponent(pebblum);
   if (collidingEntity !== pebblumComponent.targetEntityID) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "pebblum")) {
      return;
   }

   const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);

   // @Incomplete: Cause of death
   damageEntity(collidingHitbox, pebblum, 1, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingHitbox, polarVec2(150, hitDirection));
   addLocalInvulnerabilityHash(collidingEntity, "pebblum", 0.3);
}