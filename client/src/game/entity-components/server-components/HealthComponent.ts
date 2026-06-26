import { HitFlags } from "../../../../../shared/src/client-server-types";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Settings } from "../../../../../shared/src/settings";
import { Point } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import { ComponentTint, createComponentTint } from "../../EntityRenderObject";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import { playerInstance } from "../../player";
import { Hitbox } from "../../hitboxes";
import { discombobulate } from "../../player-action-handling";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData } from "../component-types";
import { HealthBar_setHealth } from "../../../ui/game/HealthBar";
import { registerServerComponentArray } from "../component-registry";
import { registerDirtyRenderObject } from "../../rendering/render-part-matrices";

const enum Var {
   /** Amount of seconds that the hit flash occurs for */
   ATTACK_HIT_FLASH_DURATION = 0.4,
   MAX_REDNESS = 0.85
}

export interface HealthComponentData {
   readonly health: number;
   readonly maxHealth: number;
}

export interface HealthComponent {
   health: number;
   maxHealth: number;

   secondsSinceLastHit: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.health, typeof HealthComponentArray> {}
}

export const HealthComponentArray = registerServerComponentArray(
   ServerComponentType.health,
   new ServerComponentArray(false, createComponent, getMaxRenderParts, decodeData)
);
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

const calculateRedness = (healthComponent: HealthComponent): number => {
   let redness: number;
   if (healthComponent.secondsSinceLastHit > Var.ATTACK_HIT_FLASH_DURATION) {
      redness = 0;
   } else {
      redness = Var.MAX_REDNESS * (1 - healthComponent.secondsSinceLastHit / Var.ATTACK_HIT_FLASH_DURATION);
   }
   return redness;
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
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const healthComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.health);
   
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

function onTick(entity: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
   
   healthComponent.secondsSinceLastHit += Settings.DT_S;

   const renderObject = getEntityRenderObject(entity);
   renderObject.recalculateTint();
   registerDirtyRenderObject(entity, renderObject);

   if (healthComponent.secondsSinceLastHit >= Var.ATTACK_HIT_FLASH_DURATION) {
      HealthComponentArray.queueComponentDeactivate(entity);
   }
}

function onHit(entity: Entity, _hitbox: Hitbox, _hitPosition: Point, hitFlags: number): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
      
   const isDamagingHit = (hitFlags & HitFlags.NON_DAMAGING_HIT) === 0;
   if (isDamagingHit) {
      healthComponent.secondsSinceLastHit = 0;
      HealthComponentArray.activateComponent(healthComponent, entity);
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
   HealthBar_setHealth(healthComponent.health);
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