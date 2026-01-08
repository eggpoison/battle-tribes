import { Point, polarVec2, positionIsInWorld, randAngle, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Biome } from "battletribes-shared/biomes";
import Layer from "../Layer";
import { createIceSpikesConfig } from "../entities/resources/ice-spikes";
import { TransformComponentArray } from "./TransformComponent";
import { createEntity, entityExists, getEntityLayer, getEntityType } from "../world";
import { EntityConfig } from "../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { StatusEffect } from "battletribes-shared/status-effects";
import { createIceShardConfig } from "../entities/projectiles/ice-shard";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent";
import { getDistanceToClosestEntity } from "../layer-utils";
import { applyKnockback, Hitbox, addHitboxVelocity } from "../hitboxes";

const enum Vars {
   TICKS_TO_GROW = 1/5 * Settings.TICK_RATE,
   GROWTH_TICK_CHANCE = 0.5,
   GROWTH_OFFSET = 60
}

export class IceSpikesComponent {
   public readonly maxChildren = randInt(0, 3);
   public numChildrenIceSpikes = 0;
   public iceSpikeGrowProgressTicks = 0;
   public rootIceSpike: Entity;

   constructor(rootIceSpikes: Entity) {
      this.rootIceSpike = rootIceSpikes;
   }
}

export const IceSpikesComponentArray = new ComponentArray<IceSpikesComponent>(ServerComponentType.iceSpikes, true, getDataLength, addDataToPacket);
IceSpikesComponentArray.onInitialise = onInitialise;
IceSpikesComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
IceSpikesComponentArray.preRemove = preRemove;
IceSpikesComponentArray.onHitboxCollision = onHitboxCollision;

function onInitialise(config: EntityConfig, entity: Entity): void {
   if (config.components[ServerComponentType.iceSpikes]!.rootIceSpike === 0) {
      config.components[ServerComponentType.iceSpikes]!.rootIceSpike = entity;
   }
}

const canGrow = (iceSpikesComponent: IceSpikesComponent): boolean => {
   if (!entityExists(iceSpikesComponent.rootIceSpike)) {
      return false;
   }
   
   const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikesComponent.rootIceSpike);
   return rootIceSpikesComponent.numChildrenIceSpikes < rootIceSpikesComponent.maxChildren;
}

const grow = (iceSpikes: Entity): void => {
   // @Speed: Garbage collection

   const transformComponent = TransformComponentArray.getComponent(iceSpikes);
   const hitbox = transformComponent.hitboxes[0];

   // Calculate the spawn position for the new ice spikes
   const position = hitbox.box.position.copy();
   const offsetDirection = randAngle();
   position.x += Vars.GROWTH_OFFSET * Math.sin(offsetDirection);
   position.y += Vars.GROWTH_OFFSET * Math.cos(offsetDirection);

   // Don't grow outside the board
   if (!positionIsInWorld(position.x, position.y)) {
      return;
   }

   // Only grow into tundra
   const tileX = Math.floor(position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(position.y / Settings.TILE_SIZE);
   const layer = getEntityLayer(iceSpikes);
   if (layer.getTileXYBiome(tileX, tileY) !== Biome.tundra) {
      return;
   }

   // @Speed: this function can be way too slow... just need to check for any entities within 40 units
   const minDistanceToEntity = getDistanceToClosestEntity(layer, position);
   if (minDistanceToEntity >= 40) {
      const iceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes);

      const config = createIceSpikesConfig(position.copy(), randAngle(), iceSpikesComponent.rootIceSpike);
      createEntity(config, layer, 0);
      
      const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikesComponent.rootIceSpike);
      rootIceSpikesComponent.numChildrenIceSpikes++;
   }
}

function onTick(iceSpikes: Entity): void {
   const iceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes);
   if (canGrow(iceSpikesComponent) && Math.random() < Vars.GROWTH_TICK_CHANCE * Settings.DT_S) {
      iceSpikesComponent.iceSpikeGrowProgressTicks++;
      if (iceSpikesComponent.iceSpikeGrowProgressTicks >= Vars.TICKS_TO_GROW) {
         grow(iceSpikes);
      }
   }
}

function preRemove(iceSpikes: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(iceSpikes);
   const iceSpikesHitbox = transformComponent.hitboxes[0];
   
   // Explode into a bunch of ice spikes
   const numProjectiles = randInt(3, 4);
   createIceShardExplosion(getEntityLayer(iceSpikes), iceSpikesHitbox.box.position.x, iceSpikesHitbox.box.position.y, numProjectiles);
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

/** Forces an ice spike to immediately grow its maximum number of children */
const forceMaxGrowIceSpike = (iceSpikes: Entity): void => {
   const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes);
   
   const connectedIceSpikes = [iceSpikes];

   for (let attempts = 0; rootIceSpikesComponent.numChildrenIceSpikes < rootIceSpikesComponent.maxChildren && attempts < 99; attempts++) {
      const growingIceSpikes = connectedIceSpikes[Math.floor(connectedIceSpikes.length * Math.random())];
      grow(growingIceSpikes);
   }
}

export function forceMaxGrowAllIceSpikes(): void {
   for (let i = 0; i < IceSpikesComponentArray.activeEntities.length; i++) {
      const entity = IceSpikesComponentArray.activeEntities[i];
      forceMaxGrowIceSpike(entity);
   }
}

export function createIceShardExplosion(layer: Layer, originX: number, originY: number, numProjectiles: number): void {
   for (let i = 0; i < numProjectiles; i++) {
      const moveDirection = randAngle();
      const x = originX + 10 * Math.sin(moveDirection);
      const y = originY + 10 * Math.cos(moveDirection);
      const position = new Point(x, y);

      const config = createIceShardConfig(position, moveDirection);

      const iceShardHitbox = config.components[ServerComponentType.transform]!.hitboxes[0];
      addHitboxVelocity(iceShardHitbox, polarVec2(700, moveDirection));

      createEntity(config, layer, 0);
   }
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   
   const collidingEntityType = getEntityType(collidingEntity);
   // @Hack
   if (collidingEntityType === EntityType.yeti || collidingEntityType === EntityType.snowball || collidingEntityType === EntityType.inguSerpent || collidingEntityType === EntityType.tukmok || collidingEntityType === EntityType.snobe) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (canDamageEntity(healthComponent, "ice_spikes")) {
         const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);
         
         damageEntity(collidingHitbox, hitbox.entity, 1, DamageSource.iceSpikes, AttackEffectiveness.effective, collisionPoint, 0);
         applyKnockback(collidingHitbox, polarVec2(180, hitDirection));
         addLocalInvulnerabilityHash(collidingEntity, "ice_spikes", 0.3);
   
         if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
            applyStatusEffect(collidingEntity, StatusEffect.freezing, 5 * Settings.TICK_RATE);
         }
      }
   }
}
