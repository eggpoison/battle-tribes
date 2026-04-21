import { Point, HitFlags, Entity, ServerComponentType, PacketReader, Settings } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { ComponentTint, createComponentTint } from "../../EntityRenderObject";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import { playerInstance } from "../../player";
import { Hitbox } from "../../hitboxes";
import { discombobulate } from "../../player-action-handling";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { getServerComponentData } from "../../entity-component-types";
import { HealthBar_setHealth } from "../../../ui/game/HealthBar";
import { registerServerComponentArray } from "../component-register";

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

class _HealthComponentArray extends ServerComponentArray<HealthComponent, HealthComponentData> {
   public decodeData(reader: PacketReader): HealthComponentData {
      const health = reader.readNumber();
      const maxHealth = reader.readNumber();

      return {
         health: health,
         maxHealth: maxHealth
      };
   }

   public createComponent(entityComponentData: EntityComponentData): HealthComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const healthComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.health);
      
      return {
         health: healthComponentData.health,
         maxHealth: healthComponentData.maxHealth,
         // @Hack: ideally should be sent from server
         secondsSinceLastHit: 99999
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public onTick(entity: Entity): void {
      const healthComponent = HealthComponentArray.getComponent(entity);
      
      const previousRedness = calculateRedness(healthComponent);
      healthComponent.secondsSinceLastHit += Settings.DT_S;

      const newRedness = calculateRedness(healthComponent);

      if (newRedness !== previousRedness) {
         const renderObject = getEntityRenderObject(entity);
         renderObject.recalculateTint();
      }
   }

   public onHit(entity: Entity, _hitbox: Hitbox, _hitPosition: Point, hitFlags: number): void {
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
      
   public updateFromData(data: HealthComponentData, entity: Entity): void {
      const healthComponent = HealthComponentArray.getComponent(entity);
      healthComponent.health = data.health;
      healthComponent.maxHealth = data.maxHealth;
   }

   public updatePlayerFromData(data: HealthComponentData): void {
      this.updateFromData(data, playerInstance!);

      const healthComponent = HealthComponentArray.getComponent(playerInstance!);
      HealthBar_setHealth(healthComponent.health);
   }

   public calculateTint(entity: Entity): ComponentTint {
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
}

export const HealthComponentArray = registerServerComponentArray(ServerComponentType.health, _HealthComponentArray, true);

export function createHealthComponentData(): HealthComponentData {
   return {
      health: 0,
      maxHealth: 0
   };
}

const calculateRedness = (healthComponent: HealthComponent): number => {
   let redness: number;
   if (healthComponent.secondsSinceLastHit > ATTACK_HIT_FLASH_DURATION) {
      redness = 0;
   } else {
      redness = MAX_REDNESS * (1 - healthComponent.secondsSinceLastHit / ATTACK_HIT_FLASH_DURATION);
   }
   return redness;
}