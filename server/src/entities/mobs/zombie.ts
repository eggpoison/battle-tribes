import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { ZombieComponentArray, zombieShouldAttackEntity } from "../../components/ZombieComponent";
import { InventoryCreationInfo, pickupItemEntity } from "../../components/InventoryComponent";
import Board from "../../Board";
import { wasTribeMemberKill } from "../tribes/tribe-member";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TombstoneComponentArray } from "../../components/TombstoneComponent";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";

export const enum ZombieVars {
   CHASE_PURSUE_TIME_TICKS = 5 * Settings.TPS,
   VISION_RANGE = 375
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.zombie
   | ServerComponentType.wanderAI
   | ServerComponentType.aiHelper
   | ServerComponentType.inventory
   | ServerComponentType.inventoryUse;

const MAX_HEALTH = 20;


export function createZombieConfig(): ComponentConfig<ComponentTypes> {
   const inventories = new Array<InventoryCreationInfo>();
   const usedInventoryNames = new Array<InventoryName>();

   inventories.push({
      inventoryName: InventoryName.handSlot,
      width: 1,
      height: 1,
      options: { acceptsPickedUpItems: true, isDroppedOnDeath: true, isSentToEnemyPlayers: false },
      items: []
   });

   if (Math.random() < 0.7) {
      usedInventoryNames.push(InventoryName.offhand);
      inventories.push({
         inventoryName: InventoryName.offhand,
         width: 0,
         height: 0,
         options: { acceptsPickedUpItems: true, isDroppedOnDeath: true, isSentToEnemyPlayers: false },
         items: []
      });
   }
   
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.zombie,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, 32), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0)]
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
         maxHealth: MAX_HEALTH
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.zombie]: {
         zombieType: randInt(0, 2),
         tombstone: 0
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: ZombieVars.VISION_RANGE
      },
      [ServerComponentType.inventory]: {
         inventories: [
         ]
      },
      [ServerComponentType.inventoryUse]: {
         usedInventoryNames: usedInventoryNames
      }
   };
}

export function onZombieCollision(zombie: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   // Pick up item entities
   if (Board.getEntityType(collidingEntity) === EntityType.itemEntity) {
      pickupItemEntity(zombie, collidingEntity);
      return;
   }
   
   if (!zombieShouldAttackEntity(zombie, collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "zombie")) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(zombie);
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

   const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

   // Damage and knock back the player
   damageEntity(collidingEntity, zombie, 1, PlayerCauseOfDeath.zombie, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 150, hitDirection);
   addLocalInvulnerabilityHash(healthComponent, "zombie", 0.3);

   // Push the zombie away from the entity
   const flinchDirection = hitDirection + Math.PI;
   const physicsComponent = PhysicsComponentArray.getComponent(zombie);
   physicsComponent.externalVelocity.x += 100 * Math.sin(flinchDirection);
   physicsComponent.externalVelocity.y += 100 * Math.cos(flinchDirection);
}

export function onZombieHurt(zombie: EntityID, attackingEntity: EntityID): void {
   // @Cleanup: too many ifs. generalise
   const attackingEntityType = Board.getEntityType(attackingEntity);
   if (HealthComponentArray.hasComponent(attackingEntity) && attackingEntityType !== EntityType.iceSpikes && attackingEntityType !== EntityType.cactus && attackingEntityType !== EntityType.floorSpikes && attackingEntityType !== EntityType.wallSpikes && attackingEntityType !== EntityType.floorPunjiSticks && attackingEntityType !== EntityType.wallPunjiSticks) {
      const zombieComponent = ZombieComponentArray.getComponent(zombie);
      zombieComponent.attackingEntityIDs[attackingEntity] = ZombieVars.CHASE_PURSUE_TIME_TICKS;
   }
}

export function onZombieDeath(zombie: EntityID): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie);
   if (zombieComponent.tombstone !== 0 && TombstoneComponentArray.hasComponent(zombieComponent.tombstone)) {
      const tombstoneComponent = TombstoneComponentArray.getComponent(zombieComponent.tombstone);
      tombstoneComponent.numZombies--;
   }

   if (wasTribeMemberKill(zombie) && Math.random() < 0.1) {
      createItemsOverEntity(zombie, ItemType.eyeball, 1, 40);
   }
}

export function onZombieVisibleEntityHurt(zombie: EntityID, hurtEntity: EntityID): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie);

   zombieComponent.visibleHurtEntityID = hurtEntity;
   zombieComponent.visibleHurtEntityTicks = 0;
}