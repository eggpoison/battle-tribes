import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Item } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, lerp } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponentArray, InventoryComponentArray, InventoryUseComponentArray, ThrowingProjectileComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { ThrowingProjectileComponent } from "../../components/ThrowingProjectileComponent";
import Board from "../../Board";
import { findInventoryContainingItem } from "../../components/InventoryComponent";
import { getInventoryUseInfo } from "../../components/InventoryUseComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { SERVER } from "../../server";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import Tribe from "../../Tribe";
import { EntityRelationship, TribeComponent, getEntityRelationship } from "../../components/TribeComponent";

const RETURN_TIME_TICKS = 1 * Settings.TPS;

export function createBattleaxeProjectile(position: Point, tribeMemberID: number, item: Item, tribe: Tribe): Entity {
   const battleaxe = new Entity(position, EntityType.battleaxeProjectile, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   
   const hitbox = new CircularHitbox(battleaxe.position.x, battleaxe.position.y, 0.6, 0, 0, HitboxCollisionType.soft, 32, battleaxe.getNextHitboxLocalID(), battleaxe.rotation);
   battleaxe.addHitbox(hitbox);
   
   PhysicsComponentArray.addComponent(battleaxe.id, new PhysicsComponent(true, true));
   TribeComponentArray.addComponent(battleaxe.id, new TribeComponent(tribe));
   ThrowingProjectileComponentArray.addComponent(battleaxe.id, new ThrowingProjectileComponent(tribeMemberID, item));

   // @Incomplete: Make the battleaxe not be pushed by collisions 
   
   return battleaxe;
}

export function tickBattleaxeProjectile(battleaxe: Entity): void {
   if (battleaxe.ageTicks < RETURN_TIME_TICKS) {
      battleaxe.rotation -= 6 * Math.PI / Settings.TPS;
   } else {
      const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(battleaxe.id);
      if (!Board.entityRecord.hasOwnProperty(throwingProjectileComponent.tribeMemberID)) {
         battleaxe.remove();
         return;
      }
      
      const owner = Board.entityRecord[throwingProjectileComponent.tribeMemberID]!;

      if (entitiesAreColliding(battleaxe, owner) !== CollisionVars.NO_COLLISION) {
         battleaxe.remove();
         return;
      }

      const ticksSinceReturn = battleaxe.ageTicks - RETURN_TIME_TICKS;
      battleaxe.rotation -= lerp(6 * Math.PI / Settings.TPS, 0, Math.min(ticksSinceReturn / Settings.TPS * 1.25, 1));

      const returnDirection = battleaxe.position.calculateAngleBetween(owner.position);
      const returnSpeed = lerp(0, 800, Math.min(ticksSinceReturn / Settings.TPS * 1.5, 1));
      battleaxe.position.x += returnSpeed * Settings.I_TPS * Math.sin(returnDirection);
      battleaxe.position.y += returnSpeed * Settings.I_TPS * Math.cos(returnDirection);

      const physicsComponent = PhysicsComponentArray.getComponent(battleaxe.id);
      physicsComponent.positionIsDirty = true;
      physicsComponent.hitboxesAreDirty = true;

      // Turn to face the owner
      battleaxe.turn(owner.rotation, ticksSinceReturn / Settings.TPS * Math.PI);
   }
   
   const physicsComponent = PhysicsComponentArray.getComponent(battleaxe.id);
   physicsComponent.hitboxesAreDirty = true;
}

export function onBattleaxeProjectileCollision(battleaxe: Entity, collidingEntity: Entity): void {
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
      damageEntity(collidingEntity, 4, tribeMember, PlayerCauseOfDeath.spear, attackHash);
      applyKnockback(collidingEntity, 150, direction);
      SERVER.registerEntityHit({
         entityPositionX: collidingEntity.position.x,
         entityPositionY: collidingEntity.position.y,
         hitEntityID: collidingEntity.id,
         damage: 4,
         knockback: 150,
         angleFromAttacker: direction,
         attackerID: spearComponent.tribeMemberID,
         flags: 0
      });
      addLocalInvulnerabilityHash(HealthComponentArray.getComponent(collidingEntity.id), attackHash, 0.3);
   }
}

export function onBattleaxeProjectileRemove(battleaxe: Entity): void {
   const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(battleaxe.id);
   if (Board.entityRecord.hasOwnProperty(throwingProjectileComponent.tribeMemberID)) {
      // Find the inventory the battleaxe item is in
      const ownerInventoryComponent = InventoryComponentArray.getComponent(throwingProjectileComponent.tribeMemberID);
      const inventory = findInventoryContainingItem(ownerInventoryComponent, throwingProjectileComponent.item);
      if (inventory !== null) {
         const ownerInventoryUseComponent = InventoryUseComponentArray.getComponent(throwingProjectileComponent.tribeMemberID);
         const useInfo = getInventoryUseInfo(ownerInventoryUseComponent, inventory.name);
         useInfo.thrownBattleaxeItemID = -1;
      }
   }
}