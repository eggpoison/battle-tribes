import { Settings } from "webgl-test-shared/dist/settings";
import { lerp } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { HealthComponentData, ServerComponentType } from "webgl-test-shared/dist/components";

/** Amount of seconds that the hit flash occurs for */
const ATTACK_HIT_FLASH_DURATION = 0.4;
const MAX_REDNESS = 0.85;

class HealthComponent extends ServerComponent<ServerComponentType.health> {
   public health: number;
   public maxHealth: number;

   public secondsSinceLastHit = 99999;
   
   constructor(entity: Entity, data: HealthComponentData) {
      super(entity);

      this.health = data.health;
      this.maxHealth = data.maxHealth;
   }

   public tick(): void {
      this.secondsSinceLastHit += Settings.I_TPS;
      
      let redness: number;
      if (this.secondsSinceLastHit === null || this.secondsSinceLastHit > ATTACK_HIT_FLASH_DURATION) {
         redness = 0;
      } else {
         redness = MAX_REDNESS * (1 - this.secondsSinceLastHit / ATTACK_HIT_FLASH_DURATION);
      }

      this.entity.tintR = lerp(this.entity.tintR, 1, redness);
      this.entity.tintG = lerp(this.entity.tintG, -1, redness);
      this.entity.tintB = lerp(this.entity.tintB, -1, redness);
   }

   public onHit(isDamagingHit: boolean): void {
      if (isDamagingHit) {
         this.secondsSinceLastHit = 0;
      }
   }
   
   public updateFromData(data: HealthComponentData): void {
      this.health = data.health;
      this.maxHealth = data.maxHealth;
   }
}

export default HealthComponent;