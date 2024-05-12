import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { HealthComponentArray, SpikesComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { SERVER } from "../../server";
import { TribeComponent } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { SpikesComponent } from "../../components/SpikesComponent";

const FLOOR_HITBOX_SIZE = 48 - 0.05;

const WALL_HITBOX_WIDTH = 56 - 0.05;
const WALL_HITBOX_HEIGHT = 32 - 0.05;

export function createFloorPunjiSticksHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   // @Hack mass
   hitboxes.push(new RectangularHitbox(parentX, parentY, Number.EPSILON, 0, 0, HitboxCollisionType.soft, localID, parentRotation, FLOOR_HITBOX_SIZE, FLOOR_HITBOX_SIZE, 0));
   return hitboxes;
}

export function createWallPunjiSticksHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   // @Hack mass
   hitboxes.push(new RectangularHitbox(parentX, parentY, Number.EPSILON, 0, 0, HitboxCollisionType.soft, localID, parentRotation, WALL_HITBOX_WIDTH, WALL_HITBOX_HEIGHT, 0));
   return hitboxes;
}

export function createPunjiSticks(position: Point, rotation: number, tribe: Tribe, attachedWallID: number): Entity {
   const entityType = attachedWallID !== 0 ? EntityType.wallPunjiSticks : EntityType.floorPunjiSticks;
   
   const punjiSticks = new Entity(position, entityType, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   punjiSticks.rotation = rotation;

   const hitboxes = attachedWallID !== 0 ? createWallPunjiSticksHitboxes(position.x, position.y, punjiSticks.getNextHitboxLocalID(), rotation) : createFloorPunjiSticksHitboxes(position.x, position.y, punjiSticks.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      punjiSticks.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(punjiSticks.id, new HealthComponent(10));
   StatusEffectComponentArray.addComponent(punjiSticks.id, new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned));
   TribeComponentArray.addComponent(punjiSticks.id, new TribeComponent(tribe));
   SpikesComponentArray.addComponent(punjiSticks.id, new SpikesComponent(attachedWallID));

   return punjiSticks;
}

export function onPunjiSticksCollision(punjiSticks: Entity, collidingEntity: Entity): void {
   // @Incomplete: Why is this condition neeeded? Shouldn't be able to be placed colliding with other structures anyway.
   if (collidingEntity.type === EntityType.floorSpikes || collidingEntity.type === EntityType.wallSpikes || collidingEntity.type === EntityType.door || collidingEntity.type === EntityType.wall) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
   if (!canDamageEntity(healthComponent, "punjiSticks")) {
      return;
   }
   
   const hitDirection = punjiSticks.position.calculateAngleBetween(collidingEntity.position);
   // @Incomplete: Cause of death
   damageEntity(collidingEntity, 1, punjiSticks, PlayerCauseOfDeath.yeti, "punjiSticks");
   SERVER.registerEntityHit({
      entityPositionX: collidingEntity.position.x,
      entityPositionY: collidingEntity.position.y,
      hitEntityID: collidingEntity.id,
      damage: 1,
      knockback: 0,
      angleFromAttacker: hitDirection,
      attackerID: punjiSticks.id,
      flags: 0
   });
   addLocalInvulnerabilityHash(healthComponent, "punjiSticks", 0.3);

   if (StatusEffectComponentArray.hasComponent(collidingEntity.id)) {
      applyStatusEffect(collidingEntity.id, StatusEffect.poisoned, 2 * Settings.TPS);
   }
}