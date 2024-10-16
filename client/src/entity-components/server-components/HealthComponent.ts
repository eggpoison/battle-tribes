import { Settings } from "battletribes-shared/settings";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { updateHealthBar } from "../../components/game/HealthBar";
import Player from "../../entities/Player";
import { discombobulate } from "../../components/game/GameInteractableLayer";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { ComponentTint, createComponentTint } from "../../Entity";
import { getEntityRenderInfo } from "../../world";

/** Amount of seconds that the hit flash occurs for */
const ATTACK_HIT_FLASH_DURATION = 0.4;
const MAX_REDNESS = 0.85;

class HealthComponent {
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
   updatePlayerFromData: updatePlayerFromData,
   calculateTint: calculateTint
});

const calculateRedness = (healthComponent: HealthComponent): number => {
   let redness: number;
   if (healthComponent.secondsSinceLastHit === null || healthComponent.secondsSinceLastHit > ATTACK_HIT_FLASH_DURATION) {
      redness = 0;
   } else {
      redness = MAX_REDNESS * (1 - healthComponent.secondsSinceLastHit / ATTACK_HIT_FLASH_DURATION);
   }
   return redness;
}

function onTick(healthComponent: HealthComponent, entity: EntityID): void {
   const previousRedness = calculateRedness(healthComponent);
   healthComponent.secondsSinceLastHit += Settings.I_TPS;

   const newRedness = calculateRedness(healthComponent);

   if (newRedness !== previousRedness) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.recalculateTint();
   }
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

function calculateTint(entity: EntityID): ComponentTint {
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