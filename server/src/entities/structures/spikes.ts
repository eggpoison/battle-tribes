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
import { EntityRelationship, TribeComponent, getEntityRelationship } from "../../components/TribeComponent";
import { SpikesComponent } from "../../components/SpikesComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import { StructureComponentArray, StructureComponent, isAttachedToWall } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox } from "../../hitboxes/hitboxes";
import { HitboxFlags } from "../../hitboxes/BaseHitbox";

const FLOOR_HITBOX_SIZE = 48 - 0.05;

const WALL_HITBOX_WIDTH = 56 - 0.05;
const WALL_HITBOX_HEIGHT = 28 - 0.05;

export const SPIKE_HEALTHS = [15, 45];

export function createFloorSpikesHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   
   // @Hack mass
   const hitbox = new RectangularHitbox(parentPosition, Number.EPSILON, 0, 0, HitboxCollisionType.soft, localID, parentRotation, FLOOR_HITBOX_SIZE, FLOOR_HITBOX_SIZE, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   hitbox.flags |= HitboxFlags.NON_GRASS_BLOCKING;
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createWallSpikesHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();

   // @Hack mass
   const hitbox = new RectangularHitbox(parentPosition, Number.EPSILON, 0, 0, HitboxCollisionType.soft, localID, parentRotation, WALL_HITBOX_WIDTH, WALL_HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   hitbox.flags |= HitboxFlags.NON_GRASS_BLOCKING;
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createSpikes(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const isAttached = isAttachedToWall(connectionInfo);
   const entityType = isAttached ? EntityType.wallSpikes : EntityType.floorSpikes;

   const spikes = new Entity(position, rotation, entityType, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = isAttached ? createWallSpikesHitboxes(position, spikes.getNextHitboxLocalID(), rotation) : createFloorSpikesHitboxes(position, spikes.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      spikes.addHitbox(hitboxes[i]);
   }

   const material = BuildingMaterial.wood;
   
   HealthComponentArray.addComponent(spikes.id, new HealthComponent(SPIKE_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(spikes.id, new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned));
   StructureComponentArray.addComponent(spikes.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(spikes.id, new TribeComponent(tribe));
   SpikesComponentArray.addComponent(spikes.id, new SpikesComponent());
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

   // Don't collide with friendly entities if the spikes are covered
   const spikesComponent = SpikesComponentArray.getComponent(spikes.id);
   if (spikesComponent.isCovered && getEntityRelationship(spikes.id, collidingEntity) === EntityRelationship.friendly) {
      return;
   }

   // Reveal
   spikesComponent.isCovered = false;

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