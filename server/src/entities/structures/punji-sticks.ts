import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
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
import { EntityRelationship, TribeComponent, getEntityRelationship } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { SpikesComponent } from "../../components/SpikesComponent";
import { StructureComponentArray, StructureComponent, isAttachedToWall } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox } from "../../hitboxes/hitboxes";
import { HitboxFlags } from "../../hitboxes/BaseHitbox";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";

const FLOOR_HITBOX_SIZE = 48 - 0.05;

const WALL_HITBOX_WIDTH = 56 - 0.05;
const WALL_HITBOX_HEIGHT = 32 - 0.05;

export function createFloorPunjiSticksHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   
   // @Hack mass
   const hitbox = new RectangularHitbox(parentPosition, Number.EPSILON, 0, 0, HitboxCollisionType.soft, localID, parentRotation, FLOOR_HITBOX_SIZE, FLOOR_HITBOX_SIZE, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   hitbox.flags |= HitboxFlags.NON_GRASS_BLOCKING;
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createWallPunjiSticksHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();

   // @Hack mass
   const hitbox = new RectangularHitbox(parentPosition, Number.EPSILON, 0, 0, HitboxCollisionType.soft, localID, parentRotation, WALL_HITBOX_WIDTH, WALL_HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   hitbox.flags |= HitboxFlags.NON_GRASS_BLOCKING;
   hitboxes.push(hitbox);
   
   return hitboxes;
}

export function createPunjiSticks(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const isAttached = isAttachedToWall(connectionInfo);
   const entityType = isAttached ? EntityType.wallPunjiSticks : EntityType.floorPunjiSticks;
   
   const punjiSticks = new Entity(position, rotation, entityType, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = isAttached ? createWallPunjiSticksHitboxes(position, punjiSticks.getNextHitboxLocalID(), rotation) : createFloorPunjiSticksHitboxes(position, punjiSticks.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      punjiSticks.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(punjiSticks.id, new HealthComponent(10));
   StatusEffectComponentArray.addComponent(punjiSticks.id, new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned));
   StructureComponentArray.addComponent(punjiSticks.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(punjiSticks.id, new TribeComponent(tribe));
   SpikesComponentArray.addComponent(punjiSticks.id, new SpikesComponent());

   return punjiSticks;
}

export function onPunjiSticksCollision(punjiSticks: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   // @Incomplete: Why is this condition neeeded? Shouldn't be able to be placed colliding with other structures anyway.
   if (collidingEntity.type === EntityType.floorSpikes || collidingEntity.type === EntityType.wallSpikes || collidingEntity.type === EntityType.door || collidingEntity.type === EntityType.wall) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   // Don't collide with friendly entities if the spikes are covered
   const spikesComponent = SpikesComponentArray.getComponent(punjiSticks.id);
   if (spikesComponent.isCovered && getEntityRelationship(punjiSticks.id, collidingEntity) === EntityRelationship.friendly) {
      return;
   }

   // Reveal
   spikesComponent.isCovered = false;

   const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
   if (!canDamageEntity(healthComponent, "punjiSticks")) {
      return;
   }
   
   // @Incomplete: Cause of death
   damageEntity(collidingEntity, punjiSticks, 1, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(healthComponent, "punjiSticks", 0.3);

   if (StatusEffectComponentArray.hasComponent(collidingEntity.id)) {
      applyStatusEffect(collidingEntity.id, StatusEffect.poisoned, 2 * Settings.TPS);
   }
}