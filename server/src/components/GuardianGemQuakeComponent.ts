import { Hitbox } from "battletribes-shared/boxes/boxes";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import { destroyEntity, getEntityAgeTicks } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";

const enum Vars {
   TICKS_BEFORE_RECEED = (Settings.TPS * 0.2) | 0,
   LIFETIME_TICKS = (Settings.TPS * 0.6) | 0
}

export class GuardianGemQuakeComponent {}

export const GuardianGemQuakeComponentArray = new ComponentArray<GuardianGemQuakeComponent>(ServerComponentType.guardianGemQuake, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onHitboxCollision: onHitboxCollision,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const getLife = (ageTicks: number): number => {
   return ageTicks < Vars.TICKS_BEFORE_RECEED ? 1 : 1 - (ageTicks - Vars.TICKS_BEFORE_RECEED) / (Vars.LIFETIME_TICKS - Vars.TICKS_BEFORE_RECEED);
}

function onTick(_component: GuardianGemQuakeComponent, quake: EntityID): void {
   const age = getEntityAgeTicks(quake);

   if (age >= Vars.TICKS_BEFORE_RECEED) {
      const life = getLife(age);
      
      const transformComponent = TransformComponentArray.getComponent(quake);
      const hitbox = transformComponent.hitboxes[0];
      hitbox.box.scale = life;
      
      // @Hack: Shouldn't need a physics component to do this!
      const physicsComponent = PhysicsComponentArray.getComponent(quake);
      physicsComponent.hitboxesAreDirty = true;

      if (age >= Vars.LIFETIME_TICKS) {
         destroyEntity(quake);
      }
   }
}

function onHitboxCollision(guardian: EntityID, collidingEntity: EntityID, _pushedHitbox: Hitbox, _pushingHitbox: Hitbox, collisionPoint: Point): void {
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "gemQuake")) {
         return;
      }

      damageEntity(collidingEntity, guardian, 2, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      addLocalInvulnerabilityHash(healthComponent, "gemQuake", 0.3);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const age = getEntityAgeTicks(entity);
   const life = getLife(age);
   packet.addNumber(life);
}