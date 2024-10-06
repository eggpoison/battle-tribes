import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt, TileIndex } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { ZombieComponent, ZombieComponentArray, zombieShouldAttackEntity } from "../../components/ZombieComponent";
import { addInventoryToInventoryComponent, InventoryComponent, pickupItemEntity } from "../../components/InventoryComponent";
import { wasTribeMemberKill } from "../tribes/tribe-member";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TombstoneComponentArray } from "../../components/TombstoneComponent";
import { Inventory, InventoryName, ItemType } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getEntityType } from "../../world";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { Biome } from "../../../../shared/src/tiles";
import Layer from "../../Layer";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { InventoryUseComponent } from "../../components/InventoryUseComponent";
import { CollisionGroup } from "../../../../shared/src/collision-groups";

export const enum ZombieVars {
   CHASE_PURSUE_TIME_TICKS = 5 * Settings.TPS,
   VISION_RANGE = 375
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.zombie
   | ServerComponentType.aiHelper
   | ServerComponentType.inventory
   | ServerComponentType.inventoryUse;

const MAX_HEALTH = 20;

function tileIsValidCallback(_entity: EntityID, layer: Layer, tileIndex: TileIndex): boolean {
   return !layer.tileIsWall(tileIndex) && layer.getTileBiome(tileIndex) === Biome.grasslands;
}

export function createZombieConfig(isGolden: boolean, tombstone: EntityID): EntityConfig<ComponentTypes> {
   const zombieType = isGolden ? 3 : randInt(0, 2);

   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 32), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);

   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(MAX_HEALTH);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const zombieComponent = new ZombieComponent(zombieType, tombstone);

   const aiHelperComponent = new AIHelperComponent(ZombieVars.VISION_RANGE);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(150, Math.PI * 3, 0.4, tileIsValidCallback);
   
   const inventoryComponent = new InventoryComponent();
   const inventoryUseComponent = new InventoryUseComponent();
   
   const handSlot = new Inventory(1, 1, InventoryName.handSlot);
   addInventoryToInventoryComponent(inventoryComponent, handSlot, { acceptsPickedUpItems: true, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   inventoryUseComponent.associatedInventoryNames.push(handSlot.name);

   if (Math.random() < 0.7) {
      const offhand = new Inventory(0, 0, InventoryName.offhand);
      addInventoryToInventoryComponent(inventoryComponent, offhand, { acceptsPickedUpItems: true, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
      inventoryUseComponent.associatedInventoryNames.push(offhand.name);
   }
   
   return {
      entityType: EntityType.zombie,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.zombie]: zombieComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent
      }
   };
}

export function onZombieCollision(zombie: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   // Pick up item entities
   if (getEntityType(collidingEntity) === EntityType.itemEntity) {
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
   const attackingEntityType = getEntityType(attackingEntity);
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