import { Point, HitFlags, Entity, ServerComponentType, PacketReader, Settings } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { ComponentTint, createComponentTint } from "../../EntityRenderInfo";
import { EntityComponentData, getEntityRenderInfo } from "../../world";
import { playerInstance } from "../../player";
import { Hitbox } from "../../hitboxes";
import { healthBarState } from "../../../ui-state/health-bar-state.svelte";
import { discombobulate } from "../../player-action-handling";

export interface HealthComponentData {
   readonly health: number;
   readonly maxHealth: number;
}

export interface HealthComponent {
   health: number;
   maxHealth: number;

   secondsSinceLastHit: number;
}

/** Amount of seconds that the hit flash occurs for */
const ATTACK_HIT_FLASH_DURATION = 0.4;
const MAX_REDNESS = 0.85;

export const HealthComponentArray = new ServerComponentArray<HealthComponent, HealthComponentData, never>(ServerComponentType.health, true, createComponent, getMaxRenderParts, decodeData);
HealthComponentArray.onTick = onTick;
HealthComponentArray.onHit = onHit;
HealthComponentArray.updateFromData = updateFromData;
HealthComponentArray.updatePlayerFromData = updatePlayerFromData;
HealthComponentArray.calculateTint = calculateTint;

export function createHealthComponentData(): HealthComponentData {
   return {
      health: 0,
      maxHealth: 0
   };
}

function decodeData(reader: PacketReader): HealthComponentData {
   const health = reader.readNumber();
   const maxHealth = reader.readNumber();

   return {
      health: health,
      maxHealth: maxHealth
   };
}

function createComponent(entityComponentData: EntityComponentData): HealthComponent {
   const healthComponentData = entityComponentData.serverComponentData[ServerComponentType.health]!;
   
   return {
      health: healthComponentData.health,
      maxHealth: healthComponentData.maxHealth,
      // @Hack: ideally should be sent from server
      secondsSinceLastHit: 99999
   };
}

function getMaxRenderParts(): number {
   return 0;
}

const calculateRedness = (healthComponent: HealthComponent): number => {
   let redness: number;
   if (healthComponent.secondsSinceLastHit === null || healthComponent.secondsSinceLastHit > ATTACK_HIT_FLASH_DURATION) {
      redness = 0;
   } else {
      redness = MAX_REDNESS * (1 - healthComponent.secondsSinceLastHit / ATTACK_HIT_FLASH_DURATION);
   }
   return redness;
}

function onTick(entity: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
   
   const previousRedness = calculateRedness(healthComponent);
   healthComponent.secondsSinceLastHit += Settings.DT_S;

   const newRedness = calculateRedness(healthComponent);

   if (newRedness !== previousRedness) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.recalculateTint();
   }
}

function onHit(entity: Entity, _hitbox: Hitbox, _hitPosition: Point, hitFlags: number): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
      
   const isDamagingHit = (hitFlags & HitFlags.NON_DAMAGING_HIT) === 0;
   if (isDamagingHit) {
      healthComponent.secondsSinceLastHit = 0;
   }

   // @Hack
   if (entity === playerInstance) {
      discombobulate(0.2);
   }
}
   
function updateFromData(data: HealthComponentData, entity: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
   healthComponent.health = data.health;
   healthComponent.maxHealth = data.maxHealth;
}

function updatePlayerFromData(data: HealthComponentData): void {
   updateFromData(data, playerInstance!);

   const healthComponent = HealthComponentArray.getComponent(playerInstance!);
   healthBarState.setHealth(healthComponent.health);
}

function calculateTint(entity: Entity): ComponentTint {
   const healthComponent = HealthComponentArray.getComponent(entity);
   const redness = calculateRedness(healthComponent);

   // @Incomplete?
   // const r = lerp(this.entity.tintR, 1, redness);
   // const g = lerp(this.entity.tintG, -1, redness);
   // const b = lerp(this.entity.tintB, -1, redness);
   const r = redness;
   const g = -redness;
   const b = -redness;
   return createComponentTint(r, g, b);
}