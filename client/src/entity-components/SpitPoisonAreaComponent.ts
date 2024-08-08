import { ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import { playSound, Sound } from "../sound";
import { CircularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { Settings } from "webgl-test-shared/dist/settings";
import { lerp } from "webgl-test-shared/dist/utils";
import { createAcidParticle, createPoisonBubble } from "../particles";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

const enum Vars {
   MAX_RANGE = 55
}

class SpitPoisonAreaComponent extends ServerComponent {
   private trackSource!: AudioBufferSourceNode;
   public sound!: Sound;

   public onLoad(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);

      const audioInfo = playSound("acid-burn.mp3", 0.25, 1, transformComponent.position);
      this.trackSource = audioInfo.trackSource;
      this.sound = audioInfo.sound;

      this.trackSource.loop = true;
   }

   public onRemove(): void {
      this.trackSource.disconnect();
   }

   public padData(): void {}
   public updateFromData(): void {}
}

export default SpitPoisonAreaComponent;

export const SpitPoisonAreaComponentArray = new ComponentArray<SpitPoisonAreaComponent>(ComponentArrayType.server, ServerComponentType.spitPoisonArea, {
   onTick: onTick
});

function onTick(spitPoisonAreaComponent: SpitPoisonAreaComponent): void {
   const transformComponent = spitPoisonAreaComponent.entity.getServerComponent(ServerComponentType.transform);

   const hitbox = transformComponent.hitboxes[0] as CircularHitbox;
   const range = hitbox.radius;

   spitPoisonAreaComponent.sound.volume = lerp(0.25, 0, 1 - range / Vars.MAX_RANGE);

   if (Vars.MAX_RANGE * Math.random() < range) {
      // Calculate spawn position
      const offsetMagnitude = range * Math.random();
      const moveDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(moveDirection);
      const spawnPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(moveDirection);

      createPoisonBubble(spawnPositionX, spawnPositionY, 1);
   }

   if (Math.random() >= range * range / Settings.TPS / 5) {
      return;
   }

   const offsetMagnitude = range * Math.random();
   const offsetDirection = 2 * Math.PI * Math.random();
   const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);

   createAcidParticle(x, y);
}