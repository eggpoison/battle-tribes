import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import Entity from "../../Entity";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { EntityCreationInfo } from "../../entity-components";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { HealthComponentArray } from "../../components/HealthComponent";

type ComponentTypes = [ServerComponentType.physics, ServerComponentType.tribe];

const ARROW_WIDTH = 5 * 4;
const ARROW_HEIGHT = 14 * 4;
const ARROW_DESTROY_DISTANCE = Math.sqrt(Math.pow(ARROW_WIDTH / 2, 2) + Math.pow(ARROW_HEIGHT, 2));

export function createIceArrow(position: Point, rotation: number, tribe: Tribe): EntityCreationInfo<ComponentTypes> {
   const iceArrow = new Entity(position, rotation, EntityType.iceArrow, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   
   const hitbox = new RectangularHitbox(position, 0.4, 0, 0, HitboxCollisionType.soft, iceArrow.getNextHitboxLocalID(), iceArrow.rotation, ARROW_WIDTH, ARROW_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   iceArrow.addHitbox(hitbox);
   
   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, false, true);
   PhysicsComponentArray.addComponent(iceArrow.id, physicsComponent);

   const tribeComponent = new TribeComponent(tribe);
   TribeComponentArray.addComponent(iceArrow.id, tribeComponent);

   return {
      entity: iceArrow,
      components: {
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.tribe]: tribeComponent
      }
   };
}

export function tickIceArrow(iceArrow: Entity): void {
   if (iceArrow.ageTicks >= 1.5 * Settings.TPS) {
      iceArrow.destroy();
      return;
   }
   
   // 
   // Air resistance
   // 

   const physicsComponent = PhysicsComponentArray.getComponent(iceArrow.id);
   
   const xSignBefore = Math.sign(physicsComponent.velocity.x);
   
   const velocityLength = physicsComponent.velocity.length();
   physicsComponent.velocity.x = (velocityLength - 3) * physicsComponent.velocity.x / velocityLength;
   physicsComponent.velocity.y = (velocityLength - 3) * physicsComponent.velocity.y / velocityLength;
   if (Math.sign(physicsComponent.velocity.x) !== xSignBefore) {
      physicsComponent.velocity.x = 0;
      physicsComponent.velocity.y = 0;
   }
   
   // Destroy the arrow if it reaches the border
   if (iceArrow.position.x <= ARROW_DESTROY_DISTANCE || iceArrow.position.x >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE || iceArrow.position.y <= ARROW_DESTROY_DISTANCE || iceArrow.position.y >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE) {
      iceArrow.destroy();
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
      
      arrow.destroy();
   }
}