import { ServerComponentType } from "../../../shared/dist/components.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { Entity, DamageSource } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Hitbox } from "../hitboxes.js";
import { entityExists } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";

interface AttackerInfo {
   totalDamageFromEntity: number;
   ticksSinceLastHit: number;
}

export class AttackingEntitiesComponent {
   public readonly attackSubsideTicks: number;

   public readonly attackingEntities = new Map<number, AttackerInfo>();

   constructor(attackSubsideTicks: number) {
      this.attackSubsideTicks = attackSubsideTicks;
   }
}

export const AttackingEntitiesComponentArray = new ComponentArray<AttackingEntitiesComponent>(ServerComponentType.attackingEntities, true, getDataLength, addDataToPacket);
AttackingEntitiesComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};
AttackingEntitiesComponentArray.onTakeDamage = onTakeDamage;

function getDataLength(entity: Entity): number {
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(entity);
   return Bytes.Float32 + 3 * attackingEntitiesComponent.attackingEntities.size * Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   // @Bandwidth @Vulnerability: Only send these for the dev
   
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(entity);

   packet.writeNumber(attackingEntitiesComponent.attackingEntities.size);
   for (const pair of attackingEntitiesComponent.attackingEntities) {
      const entity = pair[0];
      const attackerInfo = pair[1];
      
      packet.writeNumber(entity);
      packet.writeNumber(attackerInfo.totalDamageFromEntity);
      packet.writeNumber(attackerInfo.ticksSinceLastHit);
   }
}

function onTick(entity: Entity): void {
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(entity);
   for (const pair of attackingEntitiesComponent.attackingEntities) {
      const entity = pair[0];
      if (!entityExists(entity)) {
         attackingEntitiesComponent.attackingEntities.delete(entity);
         continue;
      }
      
      const attackerInfo = pair[1];
      attackerInfo.ticksSinceLastHit++;
      if (attackerInfo.ticksSinceLastHit >= attackingEntitiesComponent.attackSubsideTicks) {
         attackingEntitiesComponent.attackingEntities.delete(entity);
      }
   }
}

function onTakeDamage(entity: Entity, _hitHitbox: Hitbox, attackingEntity: Entity | null, _damageSource: DamageSource, damageTaken: number): void {
   if (attackingEntity === null) {
      return;
   }
   
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(entity);
   
   const attackerInfo = attackingEntitiesComponent.attackingEntities.get(attackingEntity);
   if (attackerInfo !== undefined) {
      attackerInfo.totalDamageFromEntity += damageTaken;
      attackerInfo.ticksSinceLastHit = 0;
   } else {
      attackingEntitiesComponent.attackingEntities.set(attackingEntity, {
         totalDamageFromEntity: damageTaken,
         ticksSinceLastHit: 0
      });
   }
}