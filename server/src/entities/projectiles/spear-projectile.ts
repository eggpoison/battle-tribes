import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Item, ItemType } from "webgl-test-shared/dist/items";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { createItemEntity } from "../item-entity";
import { HealthComponentArray, ThrowingProjectileComponentArray } from "../../components/ComponentArray";
import { damageEntity } from "../../components/HealthComponent";
import { ThrowingProjectileComponent } from "../../components/ThrowingProjectileComponent";
import Board from "../../Board";
import { SERVER } from "../../server";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityCreationInfo } from "../../entity-components";

type ComponentTypes = [ServerComponentType.physics, ServerComponentType.throwingProjectile];

const DROP_VELOCITY = 400;

export function createSpearProjectile(position: Point, rotation: number, tribeMemberID: number, item: Item): EntityCreationInfo<ComponentTypes> {
   const spear = new Entity(position, rotation, EntityType.spearProjectile, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new RectangularHitbox(position, 0.5, 0, 0, HitboxCollisionType.soft, spear.getNextHitboxLocalID(), spear.rotation, 12, 60, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   spear.addHitbox(hitbox);

   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, true, false);
   PhysicsComponentArray.addComponent(spear.id, physicsComponent);

   const throwingProjectileComponent = new ThrowingProjectileComponent(tribeMemberID, item);
   ThrowingProjectileComponentArray.addComponent(spear.id, throwingProjectileComponent);

   return {
      entity: spear,
      components: {
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.throwingProjectile]: throwingProjectileComponent
      }
   };
}

export function tickSpearProjectile(spear: Entity): void {
   const physicsComponent = PhysicsComponentArray.getComponent(spear.id);

   if (physicsComponent.velocity.lengthSquared() <= DROP_VELOCITY * DROP_VELOCITY) {
      createItemEntity(spear.position.copy(), 2 * Math.PI * Math.random(), ItemType.spear, 1, 0);
      spear.destroy();
   }
}

export function onSpearProjectileCollision(spear: Entity, collidingEntity: Entity): void {
   // Don't hurt the entity who threw the spear
   const spearComponent = ThrowingProjectileComponentArray.getComponent(spear.id);
   if (typeof Board.entityRecord[spearComponent.tribeMemberID] !== "undefined" && getEntityRelationship(spearComponent.tribeMemberID, collidingEntity) === EntityRelationship.friendly) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   let tribeMember: Entity | null | undefined = Board.entityRecord[spearComponent.tribeMemberID];
   if (typeof tribeMember === "undefined") {
      tribeMember = null;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(spear.id);
   const damage = Math.floor(physicsComponent.velocity.length() / 140);
   
   // Damage the entity
   // @Temporary
   const hitDirection = spear.position.calculateAngleBetween(collidingEntity.position);
   damageEntity(collidingEntity, damage, tribeMember, PlayerCauseOfDeath.spear);
   applyKnockback(collidingEntity, 200, hitDirection);
   SERVER.registerEntityHit({
      entityPositionX: collidingEntity.position.x,
      entityPositionY: collidingEntity.position.y,
      hitEntityID: collidingEntity.id,
      damage: damage,
      knockback: 200,
      angleFromAttacker: hitDirection,
      attackerID: spearComponent.tribeMemberID,
      flags: 0
   });
   
   spear.destroy();
}