import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { createEntityFromConfig } from "../../Entity";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { createIceShardConfig } from "../projectiles/ice-shard";
import { IceSpikesComponent, IceSpikesComponentArray } from "../../components/IceSpikesComponent";
import Board from "../../Board";
import { createItemsOverEntity } from "../../entity-shared";
import { applyKnockback } from "../../components/PhysicsComponent";
import { Biome } from "webgl-test-shared/dist/tiles";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.iceSpikes;

const ICE_SPIKE_RADIUS = 40;

const TICKS_TO_GROW = 1/5 * Settings.TPS;
const GROWTH_TICK_CHANCE = 0.5;
const GROWTH_OFFSET = 60;

export function createIceSpikesConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.iceSpikes,
         collisionBit: COLLISION_BITS.iceSpikes,
         collisionMask: DEFAULT_COLLISION_MASK & ~COLLISION_BITS.iceSpikes,
         hitboxes: [new CircularHitbox(1, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, ICE_SPIKE_RADIUS)]
      },
      [ServerComponentType.health]: {
         maxHealth: 5
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.poisoned | StatusEffect.freezing | StatusEffect.bleeding
      },
      [ServerComponentType.iceSpikes]: {
         rootIceSpike: null
      }
   };
}

const canGrow = (iceSpikesComponent: IceSpikesComponent): boolean => {
   if (!Board.hasEntity(iceSpikesComponent.rootIceSpike)) {
      return false;
   }
   
   const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikesComponent.rootIceSpike);
   return rootIceSpikesComponent.numChildrenIceSpikes < rootIceSpikesComponent.maxChildren;
}

const grow = (iceSpikes: EntityID): void => {
   // @Speed: Garbage collection

   const transformComponent = TransformComponentArray.getComponent(iceSpikes);

   // Calculate the spawn position for the new ice spikes
   const position = transformComponent.position.copy();
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
      const iceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes);

      const config = createIceSpikesConfig();
      config[ServerComponentType.transform].position.x = position.x;
      config[ServerComponentType.transform].position.y = position.y;
      config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config[ServerComponentType.iceSpikes].rootIceSpike = iceSpikesComponent.rootIceSpike;
      createEntityFromConfig(config);
      
      const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikesComponent.rootIceSpike);
      rootIceSpikesComponent.numChildrenIceSpikes++;
   }
}

export function tickIceSpikes(iceSpikes: EntityID): void {
   const iceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes);

   if (canGrow(iceSpikesComponent) && Math.random() < GROWTH_TICK_CHANCE / Settings.TPS) {
      iceSpikesComponent.iceSpikeGrowProgressTicks++;
      if (iceSpikesComponent.iceSpikeGrowProgressTicks >= TICKS_TO_GROW) {
         grow(iceSpikes);
      }
   }
}

export function onIceSpikesCollision(iceSpikes: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = Board.getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.yeti || collidingEntityType === EntityType.frozenYeti || collidingEntityType === EntityType.iceSpikes || collidingEntityType === EntityType.snowball) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (canDamageEntity(healthComponent, "ice_spikes")) {
         const transformComponent = TransformComponentArray.getComponent(iceSpikes);
         const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

         const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
         
         damageEntity(collidingEntity, iceSpikes, 1, PlayerCauseOfDeath.ice_spikes, AttackEffectiveness.effective, collisionPoint, 0);
         applyKnockback(collidingEntity, 180, hitDirection);
         addLocalInvulnerabilityHash(healthComponent, "ice_spikes", 0.3);
   
         if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
            applyStatusEffect(collidingEntity, StatusEffect.freezing, 5 * Settings.TPS);
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

      const config = createIceShardConfig();
      config[ServerComponentType.transform].position.x = position.x;
      config[ServerComponentType.transform].position.y = position.y;
      config[ServerComponentType.transform].rotation = moveDirection;
      config[ServerComponentType.physics].velocityX += 700 * Math.sin(moveDirection);
      config[ServerComponentType.physics].velocityY += 700 * Math.cos(moveDirection);
      createEntityFromConfig(config);
   }
}

export function onIceSpikesDeath(iceSpikes: EntityID): void {
   if (Math.random() < 0.5) {
      createItemsOverEntity(iceSpikes, ItemType.frostcicle, 1, 40);
   }

   const transformComponent = TransformComponentArray.getComponent(iceSpikes);
   
   // Explode into a bunch of ice spikes
   const numProjectiles = randInt(3, 4);
   createIceShardExplosion(transformComponent.position.x, transformComponent.position.y, numProjectiles);
}

/** Forces an ice spike to immediately grow its maximum number of children */
const forceMaxGrowIceSpike = (iceSpikes: EntityID): void => {
   const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes);
   
   const connectedIceSpikes = [iceSpikes];

   while (rootIceSpikesComponent.numChildrenIceSpikes < rootIceSpikesComponent.maxChildren) {
      const growingIceSpikes = connectedIceSpikes[Math.floor(connectedIceSpikes.length * Math.random())];
      grow(growingIceSpikes);
   }
}

export function forceMaxGrowAllIceSpikes(): void {
   for (let i = 0; i < Board.entities.length; i++) {
      const entity = Board.entities[i];
      if (Board.getEntityType(entity) === EntityType.iceSpikes) {
         forceMaxGrowIceSpike(entity);
      }
   }
}