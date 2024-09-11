import { Settings } from "webgl-test-shared/dist/settings";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { updateHealthBar } from "../components/game/HealthBar";
import Player from "../entities/Player";
import { discombobulate } from "../player-input";

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