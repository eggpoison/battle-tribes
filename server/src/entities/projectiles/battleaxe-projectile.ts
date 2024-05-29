import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Item } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, lerp } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { ThrowingProjectileComponent, ThrowingProjectileComponentArray } from "../../components/ThrowingProjectileComponent";
import Board from "../../Board";
import { InventoryComponentArray, findInventoryContainingItem } from "../../components/InventoryComponent";
import { InventoryUseComponentArray, getInventoryUseInfo } from "../../components/InventoryUseComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import Tribe from "../../Tribe";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityCreationInfo } from "../../entity-components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";

type ComponentTypes = [ServerComponentType.physics, ServerComponentType.tribe, ServerComponentType.throwingProjectile];

const RETURN_TIME_TICKS = 1 * Settings.TPS;

export function createBattleaxeProjectile(position: Point, rotation: number, tribeMemberID: number, item: Item, tribe: Tribe): EntityCreationInfo<ComponentTypes> {
   const battleaxe = new Entity(position, rotation, EntityType.battleaxeProjectile, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   
   const hitbox = new CircularHitbox(position, 0.6, 0, 0, HitboxCollisionType.soft, 32, battleaxe.getNextHitboxLocalID(), battleaxe.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   battleaxe.addHitbox(hitbox);
   
   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, true, true);
   PhysicsComponentArray.addComponent(battleaxe.id, physicsComponent);

   const tribeComponent = new TribeComponent(tribe);
   TribeComponentArray.addComponent(battleaxe.id, tribeComponent);

   const throwingProjectileComponent = new ThrowingProjectileComponent(tribeMemberID, item);
   ThrowingProjectileComponentArray.addComponent(battleaxe.id, throwingProjectileComponent);

   // @Incomplete: Make the battleaxe not be pushed by collisions 
   
   return {
      entity: battleaxe,
      components: {
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.throwingProjectile]: throwingProjectileComponent
      }
   };
}

export function tickBattleaxeProjectile(battleaxe: Entity): void {
   const physicsComponent = PhysicsComponentArray.getComponent(battleaxe.id);
   if (battleaxe.ageTicks < RETURN_TIME_TICKS) {
      physicsComponent.angularVelocity = -6 * Math.PI;
   } else {
      physicsComponent.angularVelocity = 0;
      
      const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(battleaxe.id);

      const owner = Board.entityRecord[throwingProjectileComponent.tribeMemberID];
      if (typeof owner === "undefined") {
         battleaxe.destroy();
         return;
      }
      
      if (entitiesAreColliding(battleaxe, owner) !== CollisionVars.NO_COLLISION) {
         battleaxe.destroy();
         return;
      }

      const ticksSinceReturn = battleaxe.ageTicks - RETURN_TIME_TICKS;
      battleaxe.rotation -= lerp(6 * Math.PI / Settings.TPS, 0, Math.min(ticksSinceReturn / Settings.TPS * 1.25, 1));

      const returnDirection = battleaxe.position.calculateAngleBetween(owner.position);
      const returnSpeed = lerp(0, 800, Math.min(ticksSinceReturn / Settings.TPS * 1.5, 1));
      battleaxe.position.x += returnSpeed * Settings.I_TPS * Math.sin(returnDirection);
      battleaxe.position.y += returnSpeed * Settings.I_TPS * Math.cos(returnDirection);
      physicsComponent.positionIsDirty = true;

      // Turn to face the owner
      physicsComponent.targetRotation = owner.rotation;
      physicsComponent.turnSpeed = ticksSinceReturn / Settings.TPS * Math.PI;
   }
}

export function onBattleaxeProjectileCollision(battleaxe: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   // Don't hurt the entity who threw the spear
   const spearComponent = ThrowingProjectileComponentArray.getComponent(battleaxe.id);
   if (collidingEntity.id === spearComponent.tribeMemberID) {
      return;
   }

   const relationship = getEntityRelationship(battleaxe.id, collidingEntity);
   if (relationship === EntityRelationship.friendly || relationship === EntityRelationship.friendlyBuilding) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity.id)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
      const attackHash = "battleaxe-" + battleaxe.id;
      if (!canDamageEntity(healthComponent, attackHash)) {
         return;
      }
      
      const tribeMember = Board.tentativelyGetEntity(spearComponent.tribeMemberID);

      // Damage the entity
      const direction = battleaxe.position.calculateAngleBetween(collidingEntity.position);

      // @Incomplete cause of death
      damageEntity(collidingEntity, tribeMember, 4, PlayerCauseOfDeath.spear, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 150, direction);
      addLocalInvulnerabilityHash(HealthComponentArray.getComponent(collidingEntity.id), attackHash, 0.3);
   }
}

export function onBattleaxeProjectileRemove(battleaxe: Entity): void {
   // @Hack?
   
   
   const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(battleaxe.id);
   if (typeof Board.entityRecord[throwingProjectileComponent.tribeMemberID] === "undefined") {
      return;
   }

   // Find the inventory the battleaxe item is in
   const ownerInventoryComponent = InventoryComponentArray.getComponent(throwingProjectileComponent.tribeMemberID);
   const inventory = findInventoryContainingItem(ownerInventoryComponent, throwingProjectileComponent.item);
   if (inventory !== null) {
      const ownerInventoryUseComponent = InventoryUseComponentArray.getComponent(throwingProjectileComponent.tribeMemberID);
      const useInfo = getInventoryUseInfo(ownerInventoryUseComponent, inventory.name);
      useInfo.thrownBattleaxeItemID = -1;
   }
}