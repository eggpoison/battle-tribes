import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { createIceShard } from "../projectiles/ice-shard";
import { IceSpikesComponent, IceSpikesComponentArray } from "../../components/IceSpikesComponent";
import Board from "../../Board";
import { createItemsOverEntity } from "../../entity-shared";
import { applyKnockback } from "../../components/PhysicsComponent";
import { Biome } from "webgl-test-shared/dist/tiles";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";

const ICE_SPIKE_RADIUS = 40;

const TICKS_TO_GROW = 1/5 * Settings.TPS;
const GROWTH_TICK_CHANCE = 0.5;
const GROWTH_OFFSET = 60;

export function createIceSpikes(position: Point, rotation: number, rootIceSpike?: Entity): Entity {
   const iceSpikes = new Entity(position, rotation, EntityType.iceSpikes, COLLISION_BITS.iceSpikes, DEFAULT_COLLISION_MASK & ~COLLISION_BITS.iceSpikes);

   const hitbox = new CircularHitbox(1, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, ICE_SPIKE_RADIUS);
   iceSpikes.addHitbox(hitbox);

   HealthComponentArray.addComponent(iceSpikes.id, new HealthComponent(5));
   StatusEffectComponentArray.addComponent(iceSpikes.id, new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.freezing));
   IceSpikesComponentArray.addComponent(iceSpikes.id, new IceSpikesComponent(rootIceSpike || iceSpikes));

   return iceSpikes;
}

const canGrow = (iceSpikesComponent: IceSpikesComponent): boolean => {
   if (!Board.entityRecord.hasOwnProperty(iceSpikesComponent.rootIceSpike.id)) {
      return false;
   }
   
   const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikesComponent.rootIceSpike.id);
   return rootIceSpikesComponent.numChildrenIceSpikes < rootIceSpikesComponent.maxChildren;
}

const grow = (iceSpikes: Entity): void => {
   // @Speed: Garbage collection

   // Calculate the spawn position for the new ice spikes
   const position = iceSpikes.position.copy();
   const offsetDirection = 2 * Math.PI * Math.random();
   position.x += GROWTH_OFFSET * Math.sin(offsetDirection);
   position.y += GROWTH_OFFSET * Math.cos(offsetDirection);

   // Don't grow outside the board
   if (!Board.positionIsInBoard(position.x, position.y)) {
      return;
   }

   // Only grow into tundra
   const tile = Board.getTileAtPosition(position);
   if (tile.biome !== Biome.tundra) {
      return;
   }

   const minDistanceToEntity = Board.distanceToClosestEntity(position);
   if (minDistanceToEntity >= 40) {
      const iceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes.id);
      createIceSpikes(position, 2 * Math.PI * Math.random(), iceSpikesComponent.rootIceSpike);
      
      const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikesComponent.rootIceSpike.id);
      rootIceSpikesComponent.numChildrenIceSpikes++;
   }
}

export function tickIceSpikes(iceSpikes: Entity): void {
   const iceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes.id);

   if (canGrow(iceSpikesComponent) && Math.random() < GROWTH_TICK_CHANCE / Settings.TPS) {
      iceSpikesComponent.iceSpikeGrowProgressTicks++;
      if (iceSpikesComponent.iceSpikeGrowProgressTicks >= TICKS_TO_GROW) {
         grow(iceSpikes);
      }
   }
}

export function onIceSpikesCollision(iceSpikes: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   if (collidingEntity.type === EntityType.yeti || collidingEntity.type === EntityType.frozenYeti || collidingEntity.type === EntityType.iceSpikes || collidingEntity.type === EntityType.snowball) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity.id)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
      if (canDamageEntity(healthComponent, "ice_spikes")) {
         const hitDirection = iceSpikes.position.calculateAngleBetween(collidingEntity.position);
         
         damageEntity(collidingEntity, iceSpikes, 1, PlayerCauseOfDeath.ice_spikes, AttackEffectiveness.effective, collisionPoint, 0);
         applyKnockback(collidingEntity, 180, hitDirection);
         addLocalInvulnerabilityHash(healthComponent, "ice_spikes", 0.3);
   
         if (StatusEffectComponentArray.hasComponent(collidingEntity.id)) {
            applyStatusEffect(collidingEntity.id, StatusEffect.freezing, 5 * Settings.TPS);
         }
      }
   }
}

export function createIceShardExplosion(originX: number, originY: number, numProjectiles: number): void {
   for (let i = 0; i < numProjectiles; i++) {
      const moveDirection = 2 * Math.PI * Math.random();
      const x = originX + 10 * Math.sin(moveDirection);
      const y = originY + 10 * Math.cos(moveDirection);
      const position = new Point(x, y);

      const iceShardCreationInfo = createIceShard(position, moveDirection);

      const physicsComponent = iceShardCreationInfo.components[ServerComponentType.physics]!;
      physicsComponent.velocity.x = 700 * Math.sin(moveDirection);
      physicsComponent.velocity.y = 700 * Math.cos(moveDirection);
   }
}

export function onIceSpikesDeath(iceSpikes: Entity): void {
   if (Math.random() < 0.5) {
      createItemsOverEntity(iceSpikes, ItemType.frostcicle, 1, 40);
   }
   
   // Explode into a bunch of ice spikes
   const numProjectiles = randInt(3, 4);
   createIceShardExplosion(iceSpikes.position.x, iceSpikes.position.y, numProjectiles);
}

/** Forces an ice spike to immediately grow its maximum number of children */
const forceMaxGrowIceSpike = (iceSpikes: Entity): void => {
   const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes.id);
   
   const connectedIceSpikes = [iceSpikes];

   while (rootIceSpikesComponent.numChildrenIceSpikes < rootIceSpikesComponent.maxChildren) {
      const growingIceSpikes = connectedIceSpikes[Math.floor(connectedIceSpikes.length * Math.random())];
      grow(growingIceSpikes);
   }
}

export function forceMaxGrowAllIceSpikes(): void {
   for (let i = 0; i < Board.entities.length; i++) {
      const entity = Board.entities[i];
      if (entity.type === EntityType.iceSpikes) {
         forceMaxGrowIceSpike(entity);
      }
   }
}