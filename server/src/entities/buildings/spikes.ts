import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { BuildingMaterialComponentArray, HealthComponentArray, SpikesComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { SERVER } from "../../server";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import { SpikesComponent } from "../../components/SpikesComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";

const FLOOR_HITBOX_SIZE = 48 - 0.05;

const WALL_HITBOX_WIDTH = 56 - 0.05;
const WALL_HITBOX_HEIGHT = 28 - 0.05;

export const SPIKE_HEALTHS = [15, 45];

export function createFloorSpikesHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   // @Hack mass
   hitboxes.push(new RectangularHitbox(parentPosition, Number.EPSILON, 0, 0, HitboxCollisionType.soft, localID, parentRotation, FLOOR_HITBOX_SIZE, FLOOR_HITBOX_SIZE, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createWallSpikesHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   // @Hack mass
   hitboxes.push(new RectangularHitbox(parentPosition, Number.EPSILON, 0, 0, HitboxCollisionType.soft, localID, parentRotation, WALL_HITBOX_WIDTH, WALL_HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createSpikes(position: Point, rotation: number, tribe: Tribe, attachedWallID: number): Entity {
   const entityType = attachedWallID !== 0 ? EntityType.wallSpikes : EntityType.floorSpikes;

   const spikes = new Entity(position, rotation, entityType, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = attachedWallID !== 0 ? createWallSpikesHitboxes(position, spikes.getNextHitboxLocalID(), rotation) : createFloorSpikesHitboxes(position, spikes.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      spikes.addHitbox(hitboxes[i]);
   }

   const material = BuildingMaterial.wood;
   
   HealthComponentArray.addComponent(spikes.id, new HealthComponent(SPIKE_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(spikes.id, new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned));
   TribeComponentArray.addComponent(spikes.id, new TribeComponent(tribe));
   SpikesComponentArray.addComponent(spikes.id, new SpikesComponent(attachedWallID));
   BuildingMaterialComponentArray.addComponent(spikes.id, new BuildingMaterialComponent(material));

   return spikes;
}

export function onSpikesCollision(spikes: Entity, collidingEntity: Entity): void {
   // @Incomplete: Why is this condition neeeded? Shouldn't be able to be placed colliding with other structures anyway.
   if (collidingEntity.type === EntityType.floorSpikes || collidingEntity.type === EntityType.wallSpikes || collidingEntity.type === EntityType.door || collidingEntity.type === EntityType.wall) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
   if (!canDamageEntity(healthComponent, "woodenSpikes")) {
      return;
   }
   
   const hitDirection = spikes.position.calculateAngleBetween(collidingEntity.position);
   // @Incomplete: Cause of death
   damageEntity(collidingEntity, 1, spikes, PlayerCauseOfDeath.yeti, "woodenSpikes");
   SERVER.registerEntityHit({
      entityPositionX: collidingEntity.position.x,
      entityPositionY: collidingEntity.position.y,
      hitEntityID: collidingEntity.id,
      damage: 1,
      knockback: 0,
      angleFromAttacker: hitDirection,
      attackerID: spikes.id,
      flags: 0
   });

   addLocalInvulnerabilityHash(healthComponent, "woodenSpikes", 0.3);
}