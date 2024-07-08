import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { ArrowStatusEffectInfo, ServerComponentType } from "webgl-test-shared/dist/components";
import { GenericArrowType, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponentArray, damageEntity } from "../../components/HealthComponent";
import { ArrowComponent, ArrowComponentArray } from "../../components/ArrowComponent";
import Board from "../../Board";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityCreationInfo } from "../../components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";

// @Cleanup: should we break this up into many projectile entities?
// @Cleanup: Rename file to something more generic

type ComponentTypes = [ServerComponentType.physics, ServerComponentType.tribe, ServerComponentType.arrow];

const ARROW_WIDTH = 12;
const ARROW_HEIGHT = 64;
// @Incomplete: Use width and height from generic arrow info
const ARROW_DESTROY_DISTANCE = Math.sqrt(Math.pow(ARROW_WIDTH / 2, 2) + Math.pow(ARROW_HEIGHT, 2));

export interface GenericArrowInfo {
   readonly type: GenericArrowType;
   readonly damage: number;
   readonly knockback: number;
   readonly hitboxWidth: number;
   readonly hitboxHeight: number;
   readonly ignoreFriendlyBuildings: boolean;
   readonly statusEffect: ArrowStatusEffectInfo | null;
}

export function createWoodenArrow(position: Point, rotation: number, throwerID: number, arrowInfo: GenericArrowInfo): EntityCreationInfo<ComponentTypes> {
   const arrow = new Entity(position, rotation, EntityType.woodenArrowProjectile, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   
   const hitbox = new RectangularHitbox(0.5, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK & ~HitboxCollisionBit.ARROW_PASSABLE, 0, arrowInfo.hitboxWidth, arrowInfo.hitboxHeight, 0);
   arrow.addHitbox(hitbox);

   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, false, true);
   PhysicsComponentArray.addComponent(arrow.id, physicsComponent);
   
   const throwerTribeComponent = TribeComponentArray.getComponent(throwerID);
   const tribeComponent = new TribeComponent(throwerTribeComponent.tribe);
   TribeComponentArray.addComponent(arrow.id, tribeComponent);

   const arrowComponent = new ArrowComponent(throwerID, arrowInfo.type, arrowInfo.damage, arrowInfo.knockback, arrowInfo.ignoreFriendlyBuildings, arrowInfo.statusEffect);
   ArrowComponentArray.addComponent(arrow.id, arrowComponent);
   
   return {
      entity: arrow,
      components: {
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.arrow]: arrowComponent
      }
   };
}

export function tickArrowProjectile(arrow: Entity): void {
   if (arrow.ageTicks >= 1.5 * Settings.TPS) {
      arrow.destroy();
      return;
   }
   
   // 
   // Air resistance
   // 

   const physicsComponent = PhysicsComponentArray.getComponent(arrow.id);

   const xSignBefore = Math.sign(physicsComponent.velocity.x);
   
   const velocityLength = physicsComponent.velocity.length();
   physicsComponent.velocity.x = (velocityLength - 3) * physicsComponent.velocity.x / velocityLength;
   physicsComponent.velocity.y = (velocityLength - 3) * physicsComponent.velocity.y / velocityLength;
   if (Math.sign(physicsComponent.velocity.x) !== xSignBefore) {
      physicsComponent.velocity.x = 0;
      physicsComponent.velocity.y = 0;
   }
   
   // Destroy the arrow if it reaches the border
   if (arrow.position.x <= ARROW_DESTROY_DISTANCE || arrow.position.x >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE || arrow.position.y <= ARROW_DESTROY_DISTANCE || arrow.position.y >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE) {
      arrow.destroy();
      return;
   }
}

export function onWoodenArrowCollision(arrow: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   const arrowComponent = ArrowComponentArray.getComponent(arrow.id);

   // Ignore friendlies, and friendly buildings if the ignoreFriendlyBuildings flag is set
   const relationship = getEntityRelationship(arrow.id, collidingEntity);
   if (relationship === EntityRelationship.friendly || (arrowComponent.ignoreFriendlyBuildings && relationship === EntityRelationship.friendlyBuilding)) {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(arrow.id);

   // Collisions with embrasures are handled in the embrasures collision function
   if (collidingEntity.type === EntityType.embrasure) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity.id);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   // @Hack: do with collision bits
   // Pass over friendly spikes
   if (collidingEntity.type === EntityType.floorSpikes || collidingEntity.type === EntityType.wallSpikes || collidingEntity.type === EntityType.floorPunjiSticks || collidingEntity.type === EntityType.wallPunjiSticks) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity.id);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   if (HealthComponentArray.hasComponent(collidingEntity.id)) {
      const arrowComponent = ArrowComponentArray.getComponent(arrow.id);

      const thrower = Board.tentativelyGetEntity(arrowComponent.throwerID);
      const hitDirection = arrow.position.calculateAngleBetween(collidingEntity.position);
      
      damageEntity(collidingEntity, thrower, arrowComponent.damage, PlayerCauseOfDeath.arrow, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, arrowComponent.knockback, hitDirection);

      if (StatusEffectComponentArray.hasComponent(collidingEntity.id) && arrowComponent.statusEffect !== null) {
         applyStatusEffect(collidingEntity.id, arrowComponent.statusEffect.type, arrowComponent.statusEffect.durationTicks);
      }

      arrow.destroy();
   }
}