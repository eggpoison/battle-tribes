import { Settings } from "webgl-test-shared/dist/settings";
import { lerp } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";

/** Amount of seconds that the hit flash occurs for */
const ATTACK_HIT_FLASH_DURATION = 0.4;
const MAX_REDNESS = 0.85;

class HealthComponent extends ServerComponent {
   public health: number;
   public maxHealth: number;

   public secondsSinceLastHit = 99999;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.health = reader.readNumber();
      this.maxHealth = reader.readNumber();
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
   
   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      this.health = reader.readNumber();
      this.maxHealth = reader.readNumber();
   }
}

export default HealthComponent;