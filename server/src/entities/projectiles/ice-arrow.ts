import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import Entity from "../../Entity";
import { HealthComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { EntityRelationship, TribeComponent, getEntityRelationship } from "../../components/TribeComponent";
import Tribe from "../../Tribe";

const ARROW_WIDTH = 5 * 4;
const ARROW_HEIGHT = 14 * 4;
const ARROW_DESTROY_DISTANCE = Math.sqrt(Math.pow(ARROW_WIDTH / 2, 2) + Math.pow(ARROW_HEIGHT, 2));

export function createIceArrow(position: Point, rotation: number, tribe: Tribe): Entity {
   const iceArrow = new Entity(position, EntityType.iceArrow, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   iceArrow.rotation = rotation;
   
   const hitbox = new RectangularHitbox(iceArrow.position.x, iceArrow.position.y, 0.4, 0, 0, HitboxCollisionType.soft, iceArrow.getNextHitboxLocalID(), iceArrow.rotation, ARROW_WIDTH, ARROW_HEIGHT, 0);
   iceArrow.addHitbox(hitbox);
   
   PhysicsComponentArray.addComponent(iceArrow.id, new PhysicsComponent(false, true));
   TribeComponentArray.addComponent(iceArrow.id, new TribeComponent(tribe));

   return iceArrow;
}

export function tickIceArrow(iceArrow: Entity): void {
   if (iceArrow.ageTicks >= 1.5 * Settings.TPS) {
      iceArrow.remove();
      return;
   }
   
   // 
   // Air resistance
   // 

   const xSignBefore = Math.sign(iceArrow.velocity.x);
   
   const velocityLength = iceArrow.velocity.length();
   iceArrow.velocity.x = (velocityLength - 3) * iceArrow.velocity.x / velocityLength;
   iceArrow.velocity.y = (velocityLength - 3) * iceArrow.velocity.y / velocityLength;
   if (Math.sign(iceArrow.velocity.x) !== xSignBefore) {
      iceArrow.velocity.x = 0;
      iceArrow.velocity.y = 0;
   }
   
   // Destroy the arrow if it reaches the border
   if (iceArrow.position.x <= ARROW_DESTROY_DISTANCE || iceArrow.position.x >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE || iceArrow.position.y <= ARROW_DESTROY_DISTANCE || iceArrow.position.y >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE) {
      iceArrow.remove();
      return;
   }
}

export function onIceArrowCollision(arrow: Entity, collidingEntity: Entity): void {
   // Don't damage any friendly entities
   if (getEntityRelationship(arrow.id, collidingEntity) === EntityRelationship.friendly) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity.id)) {
      if (StatusEffectComponentArray.hasComponent(collidingEntity.id)) {
         applyStatusEffect(collidingEntity.id, StatusEffect.freezing, 3 * Settings.TPS);
      }
      
      arrow.remove();
   }
}