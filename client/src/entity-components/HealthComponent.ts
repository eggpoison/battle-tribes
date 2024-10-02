import { Settings } from "battletribes-shared/settings";
import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { updateHealthBar } from "../components/game/HealthBar";
import Player from "../entities/Player";
import { discombobulate } from "../components/game/GameInteractableLayer";

/** Amount of seconds that the hit flash occurs for */
const ATTACK_HIT_FLASH_DURATION = 0.4;
const MAX_REDNESS = 0.85;

class HealthComponent extends ServerComponent {
   public health = 0;
   public maxHealth = 0;

   public secondsSinceLastHit = 99999;

   public onHit(isDamagingHit: boolean): void {
      if (isDamagingHit) {
         this.secondsSinceLastHit = 0;
      }

      // @Hack
      if (this.entity === Player.instance) {
         discombobulate(0.2);
      }
   }
   
   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      this.health = reader.readNumber();
      this.maxHealth = reader.readNumber();
   }

   public updatePlayerFromData(reader: PacketReader): void {
      this.updateFromData(reader);
      updateHealthBar(this.health);
   }
}

export default HealthComponent;

export const HealthComponentArray = new ComponentArray<HealthComponent>(ComponentArrayType.server, ServerComponentType.health, true, {
   onTick: onTick
});

function onTick(healthComponent: HealthComponent): void {
   healthComponent.secondsSinceLastHit += Settings.I_TPS;
   
   let redness: number;
   if (healthComponent.secondsSinceLastHit === null || healthComponent.secondsSinceLastHit > ATTACK_HIT_FLASH_DURATION) {
      redness = 0;
   } else {
      redness = MAX_REDNESS * (1 - healthComponent.secondsSinceLastHit / ATTACK_HIT_FLASH_DURATION);
   }

   // @Incomplete?
   // const r = lerp(this.entity.tintR, 1, redness);
   // const g = lerp(this.entity.tintG, -1, redness);
   // const b = lerp(this.entity.tintB, -1, redness);
   const r = redness;
   const g = -redness;
   const b = -redness;
   healthComponent.setTint(r, g, b);
}