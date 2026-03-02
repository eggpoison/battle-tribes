import { ServerComponentType } from "battletribes-shared/components";
import { DamageSource, EntityType, Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, clamp } from "battletribes-shared/utils";
import { onZombieVisibleEntityHurt } from "../entities/mobs/zombie";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { registerDirtyEntity, registerEntityHeal, registerEntityHit } from "../server/player-clients";
import { ComponentArray, getComponentArrayRecord } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityComponentTypes, getEntityType } from "../world";
import { Hitbox } from "../hitboxes";
import { HitFlags } from "../../../shared/src/client-server-types";

export class HealthComponent {
   public maxHealth: number;
   public health: number;

   /** How much that incoming damage gets reduced. 0 = none, 1 = all */
   public defence = 0;
   public readonly defenceFactors: Record<string, number> = {};

   public readonly localIframeHashes = new Array<string>();
   public readonly localIframeDurations = new Array<number>();

   constructor(maxHealth: number) {
      this.maxHealth = maxHealth;
      this.health = maxHealth;
   }
}

export const HealthComponentArray = new ComponentArray<HealthComponent>(ServerComponentType.health, false, getDataLength, addDataToPacket);
HealthComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(entity: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
   
   // Update local invulnerability hashes
   for (let i = 0; i < healthComponent.localIframeHashes.length; i++) {
      healthComponent.localIframeDurations[i] -= Settings.DT_S;
      if (healthComponent.localIframeDurations[i] <= 0) {
         healthComponent.localIframeHashes.splice(i, 1);
         healthComponent.localIframeDurations.splice(i, 1);
         i--;
         HealthComponentArray.queueComponentDeactivate(entity);
      }
   }
}

export function canDamageEntity(healthComponent: HealthComponent, attackHash: string): boolean {
   // Can't attack if the entity has local invulnerability
   if (typeof attackHash !== "undefined" && healthComponent.localIframeHashes.indexOf(attackHash) !== -1) {
      return false;
   }

   return true;
}

const callOnTakeDamageCallbacks = (entity: Entity, hitHitbox: Hitbox, attackingEntity: Entity | null, damageSource: DamageSource, damage: number): void => {
   const componentArrayRecord = getComponentArrayRecord();
   const entityComponentTypes = getEntityComponentTypes(entity);
   for (const componentType of entityComponentTypes) {
      const componentArray = componentArrayRecord[componentType];
      if (typeof componentArray.onTakeDamage !== "undefined") {
         componentArray.onTakeDamage(entity, hitHitbox, attackingEntity, damageSource, damage);
      }
   }
}

const callOnDeathCallbacks = (entity: Entity, attackingEntity: Entity | null, damageSource: DamageSource): void => {
   const componentArrayRecord = getComponentArrayRecord();
   const entityComponentTypes = getEntityComponentTypes(entity);
   
   for (const componentType of entityComponentTypes) {
      const componentArray = componentArrayRecord[componentType];
      if (typeof componentArray.onDeath !== "undefined") {
         componentArray.onDeath(entity, attackingEntity, damageSource);
      }
   }
}

/**
 * Attempts to apply damage to an entity
 * @param damage The amount of damage given
 * @returns Whether the damage was received
 */
export function damageEntity(hitHitbox: Hitbox, attackingEntity: Entity | null, damage: number, damageSource: DamageSource, attackEffectiveness: AttackEffectiveness, hitPosition: Point, hitFlags: number): boolean {
   const entity = hitHitbox.entity;
   
   const componentArrayRecord = getComponentArrayRecord();

   let damageMultiplier = 1;
   const attackedEntityComponentTypes = getEntityComponentTypes(entity);
   for (const componentType of attackedEntityComponentTypes) {
      const componentArray = componentArrayRecord[componentType];
      if (typeof componentArray.getDamageTakenMultiplier !== "undefined") {
         damageMultiplier *= componentArray.getDamageTakenMultiplier(entity, hitHitbox);
      }
   }
   const damageDealt = damage * damageMultiplier;

   const healthComponent = HealthComponentArray.getComponent(entity);

   if (damageDealt !== 0) {
      const absorbedDamage = damageDealt * clamp(healthComponent.defence, 0, 1);
      const actualDamage = damageDealt - absorbedDamage;
      
      healthComponent.health -= actualDamage;
      
      registerEntityHit(entity, hitHitbox, attackingEntity, hitPosition, attackEffectiveness, damageDealt, hitFlags);
      registerDirtyEntity(entity);
   }

   // If the entity was killed by the attack, destroy the entity
   if (healthComponent.health <= 0) {
      destroyEntity(entity);

      // Call onDeath events for the dead entity
      callOnDeathCallbacks(entity, attackingEntity, damageSource);

      // Call onKill events for the attacking entity
      if (attackingEntity !== null) {
         const attackingEntityComponentTypes = getEntityComponentTypes(attackingEntity);
         for (const componentType of attackingEntityComponentTypes) {
            const componentArray = componentArrayRecord[componentType];
            if (typeof componentArray.onKill !== "undefined") {
               componentArray.onKill(attackingEntity, entity);
            }
         }
      }
   }

   // Call onTakeDamage events for the attacked entity
   callOnTakeDamageCallbacks(entity, hitHitbox, attackingEntity, damageSource, damageDealt);

   // Call onDealDamage events for the attacking entity
   if (attackingEntity !== null) {
      const attackingEntityComponentTypes = getEntityComponentTypes(attackingEntity);
      for (const componentType of attackingEntityComponentTypes) {
         const componentArray = componentArrayRecord[componentType];
         if (typeof componentArray.onDealDamage !== "undefined") {
            componentArray.onDealDamage(attackingEntity, entity, damageSource);
         }
      }
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // @Speed
   const alertedEntityIDs = new Array<number>();
   for (let i = 0; i < transformComponent.chunks.length; i++) {
      const chunk = transformComponent.chunks[i];
      for (let j = 0; j < chunk.viewingEntities.length; j++) {
         const viewingEntity = chunk.viewingEntities[j];
         if (alertedEntityIDs.indexOf(viewingEntity) !== -1) {
            continue;
         }

         const aiHelperComponent = AIHelperComponentArray.getComponent(viewingEntity);
         if (aiHelperComponent.visibleEntities.includes(entity)) {
            switch (getEntityType(viewingEntity)) {
               case EntityType.zombie: {
                  if (damageSource !== DamageSource.fire && damageSource !== DamageSource.poison) {
                     onZombieVisibleEntityHurt(viewingEntity, entity);
                  }
                  break;
               }
            }
         }

         alertedEntityIDs.push(viewingEntity);
      }
   }

   return true;
}

/** Basically every effect of hitEntity, but doesn't reduce the entity's health. */
export function hitEntityWithoutDamage(entity: Entity, hitHitbox: Hitbox, attackingEntity: Entity | null, hitPosition: Point): void {
   // @Incomplete
   // damageEntity(entity, hitHitbox, attackingEntity, 0, 0, AttackEffectiveness.effective, hitPosition, hitFlags);
   registerEntityHit(entity, hitHitbox, attackingEntity, hitPosition, AttackEffectiveness.effective, 0, HitFlags.NON_DAMAGING_HIT);
}

export function healEntity(entity: Entity, healAmount: number, healer: Entity): void {
   if (healAmount <= 0) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(entity);

   healthComponent.health += healAmount;

   // @Speed: Is there a smart way to remove this branch?
   if (healthComponent.health > healthComponent.maxHealth) {
      const amountHealed = healAmount - (healthComponent.health - healthComponent.maxHealth); // Calculate by removing excess healing from amount healed
      registerEntityHeal(entity, healer, amountHealed);

      healthComponent.health = healthComponent.maxHealth;
   } else {
      registerEntityHeal(entity, healer, healAmount);
   }

   registerDirtyEntity(entity);
}

export function addLocalInvulnerabilityHash(entity: Entity, hash: string, invulnerabilityDurationSeconds: number): void {
   const healthComponent = HealthComponentArray.getComponent(entity);

   const idx = healthComponent.localIframeHashes.indexOf(hash);
   if (idx === -1) {
      // Add new entry
      healthComponent.localIframeHashes.push(hash);
      healthComponent.localIframeDurations.push(invulnerabilityDurationSeconds);

      HealthComponentArray.activateComponent(entity);
   }
}

export function getEntityHealth(entity: Entity): number {
   const healthComponent = HealthComponentArray.getComponent(entity);
   return healthComponent.health;
}

export function addDefence(healthComponent: HealthComponent, defence: number, name: string): void {
   if (healthComponent.defenceFactors.hasOwnProperty(name)) {
      return;
   }
   
   healthComponent.defence += defence;
   healthComponent.defenceFactors[name] = defence;
}

export function removeDefence(healthComponent: HealthComponent, name: string): void {
   if (!healthComponent.defenceFactors.hasOwnProperty(name)) {
      return;
   }
   
   healthComponent.defence -= healthComponent.defenceFactors[name];
   delete healthComponent.defenceFactors[name];
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entityID: number): void {
   const healthComponent = HealthComponentArray.getComponent(entityID);

   packet.writeNumber(healthComponent.health);
   packet.writeNumber(healthComponent.maxHealth);
}