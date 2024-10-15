import { Settings } from "battletribes-shared/settings";
import ServerComponent from "../ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { updateHealthBar } from "../../components/game/HealthBar";
import Player from "../../entities/Player";
import { discombobulate } from "../../components/game/GameInteractableLayer";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";

/** Amount of seconds that the hit flash occurs for */
const ATTACK_HIT_FLASH_DURATION = 0.4;
const MAX_REDNESS = 0.85;

class HealthComponent extends ServerComponent {
   public health = 0;
   public maxHealth = 0;

   public secondsSinceLastHit = 99999;
}

export default HealthComponent;

export const HealthComponentArray = new ServerComponentArray<HealthComponent>(ServerComponentType.health, true, {
   onTick: onTick,
   onHit: onHit,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

function onTick(healthComponent: HealthComponent, entity: EntityID): void {
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
   healthComponent.setTint(entity, r, g, b);
}

function onHit(entity: EntityID, isDamagingHit: boolean): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
      
   if (isDamagingHit) {
      healthComponent.secondsSinceLastHit = 0;
   }

   // @Hack
   if (entity === Player.instance?.id) {
      discombobulate(0.2);
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
   
   healthComponent.health = reader.readNumber();
   healthComponent.maxHealth = reader.readNumber();
}

function updatePlayerFromData(reader: PacketReader): void {
   updateFromData(reader, Player.instance!.id);


   const healthComponent = HealthComponentArray.getComponent(Player.instance!.id);
   updateHealthBar(healthComponent.health);
}