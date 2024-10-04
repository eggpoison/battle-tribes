import { Hitbox } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityID, PlayerCauseOfDeath } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Packet } from "../../../shared/src/packets";
import { Point, randFloat, randInt } from "../../../shared/src/utils";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";

export interface GuardianGemFragmentProjectileComponentParams {}

export class GuardianGemFragmentProjectileComponent implements GuardianGemFragmentProjectileComponentParams {
   public readonly fragmentShape = randInt(0, 2);
   public readonly gemType = randInt(0, 2);
   public readonly tintMultiplier = randFloat(0.5, 1);
}

export const GuardianGemFragmentProjectileComponentArray = new ComponentArray<GuardianGemFragmentProjectileComponent>(ServerComponentType.guardianGemFragmentProjectile, true, {
   onCollision: onCollision,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

// function onTick(_component: GuardianGemFragmentProjectileComponent, fragment: EntityID): void {
//    const age = getEntityAgeTicks(fragment);
//    if (age >= Settings.TPS * 1.5) {
//       destroyEntity(fragment);
//    }
// }

function onCollision(guardian: EntityID, collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox, collisionPoint: Point): void {
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "gemFragmentProjectile")) {
         return;
      }

      damageEntity(collidingEntity, guardian, 1, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      addLocalInvulnerabilityHash(healthComponent, "gemFragmentProjectile", 0.2);
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