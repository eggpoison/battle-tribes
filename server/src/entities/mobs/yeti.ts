import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType, PlayerCauseOfDeath, EntityID } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, randInt, TileIndex } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { YetiComponent, YetiComponentArray } from "../../components/YetiComponent";
import Layer, { getTileIndexIncludingEdges } from "../../Layer";
import { createItemsOverEntity } from "../../entity-shared";
import { applyKnockback, PhysicsComponent } from "../../components/PhysicsComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { SnowballComponentArray } from "../../components/SnowballComponent";
import { ItemType } from "battletribes-shared/items/items";
import { EntityConfig } from "../../components";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getEntityType } from "../../world";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { Biome } from "battletribes-shared/tiles";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { CollisionGroup } from "battletribes-shared/collision-groups";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.yeti;

const YETI_SIZE = 128;

const ATTACK_PURSUE_TIME_TICKS = 5 * Settings.TPS;

export const YETI_SNOW_THROW_COOLDOWN = 7;

export enum SnowThrowStage {
   windup,
   hold,
   return
}

function positionIsValidCallback(entity: EntityID, layer: Layer, x: number, y: number): boolean {
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

   const yetiComponent = YetiComponentArray.getComponent(entity);
   return !layer.positionHasWall(x, y) && layer.getBiomeAtPosition(x, y) === Biome.tundra && yetiComponent.territory.includes(tileIndex);
}

export function createYetiConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, YETI_SIZE / 2), 3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(100);
   
   const statusEffectComponent = new StatusEffectComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(500);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(100, Math.PI * 1.5, 0.6, positionIsValidCallback);
   
   // @Incomplete?
   const yetiComponent = new YetiComponent([]);
   
   return {
      entityType: EntityType.yeti,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.yeti]: yetiComponent
      }
   };
}

export function onYetiCollision(yeti: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   
   // Don't damage ice spikes
   if (collidingEntityType === EntityType.iceSpikes) return;

   // Don't damage snowballs thrown by the yeti
   if (collidingEntityType === EntityType.snowball) {
      const snowballComponent = SnowballComponentArray.getComponent(collidingEntity);
      if (snowballComponent.yeti === yeti) {
         return;
      }
   }
   
   // Don't damage yetis which haven't damaged it
   const yetiComponent = YetiComponentArray.getComponent(yeti);
   if ((collidingEntityType === EntityType.yeti || collidingEntityType === EntityType.frozenYeti) && !yetiComponent.attackingEntities.hasOwnProperty(collidingEntity)) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "yeti")) {
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(yeti);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
      damageEntity(collidingEntity, yeti, 2, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 200, hitDirection);
      addLocalInvulnerabilityHash(healthComponent, "yeti", 0.3);
   }
}

export function onYetiHurt(yeti: EntityID, attackingEntity: EntityID, damage: number): void {
   const yetiComponent = YetiComponentArray.getComponent(yeti);

   const attackingEntityInfo = yetiComponent.attackingEntities[attackingEntity];
   if (typeof attackingEntityInfo !== "undefined") {
      attackingEntityInfo.remainingPursueTicks += ATTACK_PURSUE_TIME_TICKS;
      attackingEntityInfo.totalDamageDealt += damage;
   } else {
      yetiComponent.attackingEntities[attackingEntity] = {
         remainingPursueTicks: ATTACK_PURSUE_TIME_TICKS,
         totalDamageDealt: damage
      };
   }
}

export function onYetiDeath(yeti: EntityID): void {
   createItemsOverEntity(yeti, ItemType.raw_beef, randInt(4, 7), 80);
   createItemsOverEntity(yeti, ItemType.yeti_hide, randInt(2, 3), 80);
}