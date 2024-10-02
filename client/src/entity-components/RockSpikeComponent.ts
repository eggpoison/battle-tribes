import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { lerp } from "battletribes-shared/utils";
import RockSpikeProjectile from "../projectiles/RockSpikeProjectile";
import { RenderPart } from "../render-parts/render-parts";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

const enum Vars {
   ENTRANCE_SHAKE_DURATION = 0.5,
   EXIT_SHAKE_DURATION = 0.8
}

class RockSpikeComponent extends ServerComponent {
   public size = 0;
   public lifetime = 0;
   
   public renderPart!: RenderPart;

   public onLoad(): void {
      this.renderPart = this.entity.getRenderThing("rockSpikeProjectile:part") as RenderPart;
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.size = reader.readNumber();
      this.lifetime = reader.readNumber();
   }
}

export default RockSpikeComponent;

export const RockSpikeComponentArray = new ComponentArray<RockSpikeComponent>(ComponentArrayType.server, ServerComponentType.rockSpike, true, {
   onTick: onTick
});

function onTick(rockSpikeComponent: RockSpikeComponent): void {
   const transformComponent = rockSpikeComponent.entity.getServerComponent(ServerComponentType.transform);

   const ageSeconds = transformComponent.ageTicks / Settings.TPS;
   if (ageSeconds < Vars.ENTRANCE_SHAKE_DURATION) {
      // Entrance
      const entranceProgress = ageSeconds / Vars.ENTRANCE_SHAKE_DURATION;
      rockSpikeComponent.entity.shakeAmount = lerp(RockSpikeProjectile.ENTRANCE_SHAKE_AMOUNTS[rockSpikeComponent.size], 0, entranceProgress);
      rockSpikeComponent.renderPart.scale = lerp(RockSpikeProjectile.ENTRANCE_SCALE, 1, Math.pow(entranceProgress, 0.5));
   } else if (ageSeconds > rockSpikeComponent.lifetime - Vars.EXIT_SHAKE_DURATION) {
      // Exit
      const exitProgress = (ageSeconds - (rockSpikeComponent.lifetime - Vars.EXIT_SHAKE_DURATION)) / Vars.EXIT_SHAKE_DURATION;
      rockSpikeComponent.entity.shakeAmount = lerp(0, RockSpikeProjectile.EXIT_SHAKE_AMOUNTS[rockSpikeComponent.size], exitProgress);
      rockSpikeComponent.renderPart.opacity = 1 - Math.pow(exitProgress, 2);
      rockSpikeComponent.renderPart.scale = 1 - lerp(0, 0.5, Math.pow(exitProgress, 2));
   } else {
      rockSpikeComponent.entity.shakeAmount = 0;
   }
}