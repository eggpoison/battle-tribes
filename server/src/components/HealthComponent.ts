import { ServerComponentType } from "webgl-test-shared/dist/components";
import { PlayerCauseOfDeath, EntityType, EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { Point, clamp } from "webgl-test-shared/dist/utils";
import TombstoneDeathManager from "../tombstone-deaths";
import { onBerryBushHurt } from "../entities/resources/berry-bush";
import { onCowHurt } from "../entities/mobs/cow";
import { onKrumblidHurt } from "../entities/mobs/krumblid";
import { onTombstoneDeath } from "../entities/tombstone";
import { onZombieHurt, onZombieVisibleEntityHurt } from "../entities/mobs/zombie";
import { onSlimeDeath, onSlimeHurt } from "../entities/mobs/slime";
import { onYetiHurt } from "../entities/mobs/yeti";
import { onFishHurt } from "../entities/mobs/fish";
import { onBoulderDeath } from "../entities/resources/boulder";
import { onFrozenYetiDeath, onFrozenYetiHurt } from "../entities/mobs/frozen-yeti";
import { onPlayerHurt } from "../entities/tribes/player";
import { onGolemDeath, onGolemHurt } from "../entities/mobs/golem";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { adjustTribesmanRelationsAfterHurt, adjustTribesmanRelationsAfterKill } from "./TribesmanAIComponent";
import { onTribeMemberHurt } from "../entities/tribes/tribe-member";
import { TITLE_REWARD_CHANCES } from "../tribesman-title-generation";
import { TribeMemberComponentArray, awardTitle } from "./TribeMemberComponent";
import { onPlantDeath, onPlantHit } from "../entities/plant";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { registerEntityDeath, registerEntityHeal, registerEntityHit } from "../server/player-clients";
import { ComponentArray } from "./ComponentArray";
import Board from "../Board";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "webgl-test-shared/dist/packets";

export interface HealthComponentParams {
   maxHealth: number;
}

export class HealthComponent {
   public maxHealth: number;
   public health: number;

   /** How much that incoming damage gets reduced. 0 = none, 1 = all */
   public defence = 0;
   public readonly defenceFactors: Record<string, number> = {};

   public readonly localIframeHashes = new Array<string>();
   public readonly localIframeDurations = new Array<number>();

   constructor(params: HealthComponentParams) {
      this.maxHealth = params.maxHealth;
      this.health = params.maxHealth;
   }
}

export const HealthComponentArray = new ComponentArray<HealthComponent>(ServerComponentType.health, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(healthComponent: HealthComponent): void {
   // Update local invulnerability hashes
   for (let i = 0; i < healthComponent.localIframeHashes.length; i++) {
      healthComponent.localIframeDurations[i] -= Settings.I_TPS;
      if (healthComponent.localIframeDurations[i] <= 0) {
         healthComponent.localIframeHashes.splice(i, 1);
         healthComponent.localIframeDurations.splice(i, 1);
         i--;
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

/**
 * Attempts to apply damage to an entity
 * @param damage The amount of damage given
 * @returns Whether the damage was received
 */
export function damageEntity(entity: EntityID, attackingEntity: EntityID | null, damage: number, causeOfDeath: PlayerCauseOfDeath, attackEffectiveness: AttackEffectiveness, hitPosition: Point, hitFlags: number): boolean {
   const healthComponent = HealthComponentArray.getComponent(entity);

   const absorbedDamage = damage * clamp(healthComponent.defence, 0, 1);
   const actualDamage = damage - absorbedDamage;
   
   healthComponent.health -= actualDamage;

   registerEntityHit(entity, attackingEntity, hitPosition, attackEffectiveness, damage, hitFlags);

   // @Hack? @Cleanup? Maybe should make 'on death' component array event

   const entityType = Board.getEntityType(entity);
   
   // If the entity was killed by the attack, destroy the entity
   if (healthComponent.health <= 0) {
      Board.destroyEntity(entity);
      registerEntityDeath(entity);

      switch (entityType) {
         case EntityType.tombstone: {
            onTombstoneDeath(entity, attackingEntity);
            break;
         }
         case EntityType.slime: {
            if (attackingEntity !== null) {
               onSlimeDeath(entity, attackingEntity);
            }
            break;
         }
         case EntityType.boulder: {
            if (attackingEntity !== null) {
               onBoulderDeath(entity, attackingEntity);
            }
            break;
         }
         case EntityType.frozenYeti: {
            onFrozenYetiDeath(entity, attackingEntity);
            break;
         }
         case EntityType.player:
         case EntityType.tribeWorker:
         case EntityType.tribeWarrior: {
            if (attackingEntity !== null) {
               adjustTribesmanRelationsAfterKill(entity, attackingEntity);
            }
            break;
         }
         case EntityType.plant: {
            onPlantDeath(entity);
            break;
         }
         case EntityType.golem: {
            onGolemDeath(entity);
            break;
         }
      }

      if (attackingEntity !== null && TribeMemberComponentArray.hasComponent(attackingEntity)) {
         if (Math.random() < TITLE_REWARD_CHANCES.BLOODAXE_REWARD_CHANCE) {
            awardTitle(attackingEntity, TribesmanTitle.bloodaxe);
         } else if (Math.random() < TITLE_REWARD_CHANCES.DEATHBRINGER_REWARD_CHANCE) {
            awardTitle(attackingEntity, TribesmanTitle.deathbringer);
         } else if (entityType === EntityType.yeti && Math.random() < TITLE_REWARD_CHANCES.YETISBANE_REWARD_CHANCE) {
            awardTitle(attackingEntity, TribesmanTitle.yetisbane);
         } else if (entityType === EntityType.frozenYeti && Math.random() < TITLE_REWARD_CHANCES.WINTERSWRATH_REWARD_CHANCE) {
            awardTitle(attackingEntity, TribesmanTitle.winterswrath);
         }
      }

      if (entityType === EntityType.player) {
         TombstoneDeathManager.registerNewDeath(entity, causeOfDeath);
      }
   }

   switch (entityType) {
      case EntityType.berryBush: {
         onBerryBushHurt(entity);

         // Award gardener title
         if (attackingEntity !== null && TribeMemberComponentArray.hasComponent(attackingEntity) && Math.random() < TITLE_REWARD_CHANCES.GARDENER_REWARD_CHANCE) {
            awardTitle(attackingEntity, TribesmanTitle.gardener);
         }
         break;
      }
      case EntityType.cow: {
         if (attackingEntity !== null) {
            onCowHurt(entity, attackingEntity);
         }
         break;
      }
      case EntityType.krumblid: {
         if (attackingEntity !== null) {
            onKrumblidHurt(entity, attackingEntity);
         }
         break;
      }
      case EntityType.zombie: {
         if (attackingEntity !== null) {
            onZombieHurt(entity, attackingEntity);
         }
         break;
      }
      case EntityType.slime: {
         if (attackingEntity !== null) {
            onSlimeHurt(entity, attackingEntity);
         }
         break;
      }
      case EntityType.yeti: {
         if (attackingEntity !== null) {
            onYetiHurt(entity, attackingEntity, damage);
         }
         break;
      }
      case EntityType.fish: {
         if (attackingEntity !== null) {
            onFishHurt(entity, attackingEntity);
         }
         break;
      }
      case EntityType.frozenYeti: {
         if (attackingEntity !== null) {
            onFrozenYetiHurt(entity, attackingEntity, damage);
         }
         break;
      }
      case EntityType.player: {
         if (attackingEntity !== null) {
            onPlayerHurt(entity, attackingEntity);
         }
         break;
      }
      case EntityType.golem: {
         if (attackingEntity !== null) {
            onGolemHurt(entity, attackingEntity, damage);
         }
         break;
      }
      case EntityType.player: {
         if (attackingEntity !== null) {
            adjustTribesmanRelationsAfterHurt(entity, attackingEntity);
         }
         break;
      }
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior: {
         if (attackingEntity !== null) {
            onTribeMemberHurt(entity, attackingEntity);
            adjustTribesmanRelationsAfterHurt(entity, attackingEntity);
         }
         break;
      }
      case EntityType.plant: {
         onPlantHit(entity);
         break;
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
            switch (Board.getEntityType(viewingEntity)) {
               case EntityType.zombie: {
                  if (causeOfDeath !== PlayerCauseOfDeath.fire && causeOfDeath !== PlayerCauseOfDeath.poison) {
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

export function healEntity(entity: EntityID, healAmount: number, healer: EntityID): void {
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
}

export function addLocalInvulnerabilityHash(healthComponent: HealthComponent, hash: string, invulnerabilityDurationSeconds: number): void {
   const idx = healthComponent.localIframeHashes.indexOf(hash);
   if (idx === -1) {
      // Add new entry
      healthComponent.localIframeHashes.push(hash);
      healthComponent.localIframeDurations.push(invulnerabilityDurationSeconds);
   }
}

export function getEntityHealth(entity: EntityID): number {
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
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entityID: number): void {
   const healthComponent = HealthComponentArray.getComponent(entityID);

   packet.addNumber(healthComponent.health);
   packet.addNumber(healthComponent.maxHealth);
}