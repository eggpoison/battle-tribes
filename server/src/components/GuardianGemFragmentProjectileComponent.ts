import { Hitbox } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityID, PlayerCauseOfDeath } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { Point, randFloat, randInt } from "../../../shared/src/utils";
import { getEntityAgeTicks, destroyEntity, entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback } from "./PhysicsComponent";
import { ProjectileComponentArray } from "./ProjectileComponent";
import { TransformComponentArray } from "./TransformComponent";

export class GuardianGemFragmentProjectileComponent {
   public readonly fragmentShape = randInt(0, 2);
   public readonly gemType = randInt(0, 2);
   public readonly tintMultiplier = randFloat(0.5, 1);
}

export const GuardianGemFragmentProjectileComponentArray = new ComponentArray<GuardianGemFragmentProjectileComponent>(ServerComponentType.guardianGemFragmentProjectile, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onWallCollision: onWallCollision,
   onHitboxCollision: onHitboxCollision,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(_component: GuardianGemFragmentProjectileComponent, fragment: EntityID): void {
   const age = getEntityAgeTicks(fragment);
   if (age >= Settings.TPS * 0.75) {
      destroyEntity(fragment);
   }
}

function onWallCollision(fragment: EntityID): void {
   destroyEntity(fragment);
}

function onHitboxCollision(fragment: EntityID, collidingEntity: EntityID, _pushedHitbox: Hitbox, _pushingHitbox: Hitbox, collisionPoint: Point): void {
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "gemFragmentProjectile")) {
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(fragment);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      
      const fragmentHitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

      damageEntity(collidingEntity, fragment, 1, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 50, fragmentHitDirection);

      const projectileComponent = ProjectileComponentArray.getComponent(fragment);
      if (entityExists(projectileComponent.creator)) {
         const guardianTransformComponent = TransformComponentArray.getComponent(projectileComponent.creator);

         const directionFromGuardian = guardianTransformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
         applyKnockback(collidingEntity, 100, directionFromGuardian);
      }
      
      addLocalInvulnerabilityHash(healthComponent, "gemFragmentProjectile", 0.166);
   }
}

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const guardianGemFragmentProjectileComponent = GuardianGemFragmentProjectileComponentArray.getComponent(entity);
   packet.addNumber(guardianGemFragmentProjectileComponent.fragmentShape);
   packet.addNumber(guardianGemFragmentProjectileComponent.gemType);
   packet.addNumber(guardianGemFragmentProjectileComponent.tintMultiplier);
}