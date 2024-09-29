import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { SlimeSize, EntityType, PlayerCauseOfDeath, EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, lerp, randInt } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity, getEntityHealth, healEntity } from "../../components/HealthComponent";
import { SlimeComponent, SlimeComponentArray } from "../../components/SlimeComponent";
import { getEntitiesInRange } from "../../ai-shared";
import { createItemsOverEntity } from "../../entity-shared";
import Layer from "../../Layer";
import { wasTribeMemberKill } from "../tribes/tribe-member";
import { ServerComponentType } from "battletribes-shared/components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { ItemType } from "battletribes-shared/items/items";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createEntityFromConfig } from "../../Entity";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { destroyEntity, entityIsFlaggedForDestruction, getEntityLayer, getEntityType, getGameTicks } from "../../world";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.wanderAI
   | ServerComponentType.aiHelper
   | ServerComponentType.slime
   | ServerComponentType.craftingStation;

export const SLIME_RADII: ReadonlyArray<number> = [32, 44, 60];
const CONTACT_DAMAGE: ReadonlyArray<number> = [1, 2, 3];
export const SLIME_MERGE_WEIGHTS: ReadonlyArray<number> = [2, 5, 11];
const SLIME_DROP_AMOUNTS: ReadonlyArray<[minDropAmount: number, maxDropAmount: number]> = [
   [1, 2], // small slime
   [3, 5], // medium slime
   [6, 9] // large slime
];
export const SLIME_MAX_MERGE_WANT: ReadonlyArray<number> = [15 * Settings.TPS, 40 * Settings.TPS, 75 * Settings.TPS];

export const SLIME_VISION_RANGES = [200, 250, 300];

export const SLIME_MERGE_TIME = 7.5;

const MAX_ANGER_PROPAGATION_CHAIN_LENGTH = 5;

export const SPIT_COOLDOWN_TICKS = 4 * Settings.TPS;
export const SPIT_CHARGE_TIME_TICKS = SPIT_COOLDOWN_TICKS + Math.floor(0.8 * Settings.TPS);

export interface SlimeEntityAnger {
   angerAmount: number;
   readonly target: EntityID;
}

interface AngerPropagationInfo {
   chainLength: number;
   readonly propagatedEntityIDs: Set<number>;
}

export function createSlimeConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.slime,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.poisoned
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: 0
      },
      [ServerComponentType.slime]: {
         size: 0,
         mergeWeight: 0,
         orbSizes: []
      },
      [ServerComponentType.craftingStation]: {
         craftingStation: CraftingStation.slime
      }
   };
}

const merge = (slime1: EntityID, slime2: EntityID): void => {
   // Prevents both slimes from calling this function
   if (entityIsFlaggedForDestruction(slime2)) return;

   const slimeComponent1 = SlimeComponentArray.getComponent(slime1);
   const slimeComponent2 = SlimeComponentArray.getComponent(slime2);
   slimeComponent1.mergeWeight += slimeComponent2.mergeWeight;

   slimeComponent1.mergeTimer = SLIME_MERGE_TIME;

   if (slimeComponent1.size < SlimeSize.large && slimeComponent1.mergeWeight >= SLIME_MERGE_WEIGHTS[slimeComponent1.size + 1]) {
      const orbSizes = new Array<SlimeSize>();

      // Add orbs from the 2 existing slimes
      for (const orbSize of slimeComponent1.orbSizes) {
         orbSizes.push(orbSize);
      }
      for (const orbSize of slimeComponent2.orbSizes) {
         orbSizes.push(orbSize);
      }

      // @Incomplete: Why do we do this for both?
      orbSizes.push(slimeComponent1.size);
      orbSizes.push(slimeComponent2.size);
      
      const slime1TransformComponent = TransformComponentArray.getComponent(slime1);
      const slime2TransformComponent = TransformComponentArray.getComponent(slime2);
      
      const config = createSlimeConfig();
      config[ServerComponentType.transform].position.x = (slime1TransformComponent.position.x + slime2TransformComponent.position.x) / 2;
      config[ServerComponentType.transform].position.y = (slime1TransformComponent.position.y + slime2TransformComponent.position.y) / 2;
      config[ServerComponentType.slime].size = slimeComponent1.size + 1;
      config[ServerComponentType.slime].orbSizes = orbSizes;
      createEntityFromConfig(config, getEntityLayer(slime1));
      
      destroyEntity(slime1);
   } else {
      // @Incomplete: This allows small slimes to eat larger slimes. Very bad.
      
      // Add the other slime's health
      healEntity(slime1, getEntityHealth(slime2), slime1)

      slimeComponent1.orbSizes.push(slimeComponent2.size);

      slimeComponent1.lastMergeTicks = getGameTicks();
   }
   
   destroyEntity(slime2);
}

/**
 * Determines whether the slime wants to merge with the other slime.
 */
const wantsToMerge = (slimeComponent1: SlimeComponent, slime2: EntityID): boolean => {
   const slimeComponent2 = SlimeComponentArray.getComponent(slime2);
   
   // Don't try to merge with larger slimes
   if (slimeComponent1.size > slimeComponent2.size) return false;

   const mergeWant = getGameTicks() - slimeComponent1.lastMergeTicks;
   return mergeWant >= SLIME_MAX_MERGE_WANT[slimeComponent1.size];
}

export function onSlimeCollision(slime: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   
   // Merge with slimes
   if (collidingEntityType === EntityType.slime) {
      const slimeComponent = SlimeComponentArray.getComponent(slime);
      if (wantsToMerge(slimeComponent, collidingEntity)) {
         slimeComponent.mergeTimer -= Settings.I_TPS;
         if (slimeComponent.mergeTimer <= 0) {
            merge(slime, collidingEntity);
         }
      }
      return;
   }
   
   if (collidingEntityType === EntityType.slimewisp) return;
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "slime")) {
         return;
      }

      const slimeComponent = SlimeComponentArray.getComponent(slime);
      const damage = CONTACT_DAMAGE[slimeComponent.size];

      damageEntity(collidingEntity, slime, damage, PlayerCauseOfDeath.slime, AttackEffectiveness.effective, collisionPoint, 0);
      addLocalInvulnerabilityHash(healthComponent, "slime", 0.3);
   }
}

const addEntityAnger = (slime: EntityID, entity: EntityID, amount: number, propagationInfo: AngerPropagationInfo): void => {
   const slimeComponent = SlimeComponentArray.getComponent(slime);

   let alreadyIsAngry = false;
   for (const entityAnger of slimeComponent.angeredEntities) {
      if (entityAnger.target === entity) {
         const angerOverflow = Math.max(entityAnger.angerAmount + amount - 1, 0);

         entityAnger.angerAmount = Math.min(entityAnger.angerAmount + amount, 1);

         if (angerOverflow > 0) {
            propagateAnger(slime, entity, angerOverflow, propagationInfo);
         }

         alreadyIsAngry = true;
         break;
      }
   }

   if (!alreadyIsAngry) {
      slimeComponent.angeredEntities.push({
         angerAmount: amount,
         target: entity
      });
   }
}

const propagateAnger = (slime: EntityID, angeredEntity: EntityID, amount: number, propagationInfo: AngerPropagationInfo = { chainLength: 0, propagatedEntityIDs: new Set() }): void => {
   const transformComponent = TransformComponentArray.getComponent(slime);
   const slimeComponent = SlimeComponentArray.getComponent(slime);

   const visionRange = SLIME_VISION_RANGES[slimeComponent.size];
   // @Speed
   const layer = getEntityLayer(slime);
   const visibleEntities = getEntitiesInRange(layer, transformComponent.position.x, transformComponent.position.y, visionRange);

   // @Cleanup: don't do here
   let idx = visibleEntities.indexOf(slime);
   while (idx !== -1) {
      visibleEntities.splice(idx, 1);
      idx = visibleEntities.indexOf(slime);
   }
   
   // Propagate the anger
   for (const entity of visibleEntities) {
      if (getEntityType(entity) === EntityType.slime && !propagationInfo.propagatedEntityIDs.has(entity)) {
         const entityTransformComponent = TransformComponentArray.getComponent(entity);
         
         const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
         const distanceFactor = distance / visionRange;

         propagationInfo.propagatedEntityIDs.add(slime);
         
         propagationInfo.chainLength++;

         if (propagationInfo.chainLength <= MAX_ANGER_PROPAGATION_CHAIN_LENGTH) {
            const propogatedAnger = lerp(amount * 1, amount * 0.4, Math.sqrt(distanceFactor));
            addEntityAnger(entity, angeredEntity, propogatedAnger, propagationInfo);
         }

         propagationInfo.chainLength--;
      }
   }
}

export function onSlimeHurt(slime: EntityID, attackingEntity: EntityID): void {
   const attackingEntityType = getEntityType(attackingEntity);
   if (attackingEntityType === EntityType.iceSpikes || attackingEntityType === EntityType.cactus) return;

   addEntityAnger(slime, attackingEntity, 1, { chainLength: 0, propagatedEntityIDs: new Set() });
   propagateAnger(slime, attackingEntity, 1);
}

export function onSlimeDeath(slime: EntityID, attackingEntity: EntityID): void {
   if (wasTribeMemberKill(attackingEntity)) {
      const slimeComponent = SlimeComponentArray.getComponent(slime);
      createItemsOverEntity(slime, ItemType.slimeball, randInt(...SLIME_DROP_AMOUNTS[slimeComponent.size]), 40);
   }
}