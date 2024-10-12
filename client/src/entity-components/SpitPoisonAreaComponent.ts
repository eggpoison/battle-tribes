import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "./ServerComponent";
import { playSound, Sound } from "../sound";
import { Settings } from "battletribes-shared/settings";
import { lerp } from "battletribes-shared/utils";
import { createAcidParticle, createPoisonBubble } from "../particles";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponentArray } from "./TransformComponent";
import { EntityID } from "../../../shared/src/entities";

const enum Vars {
   MAX_RANGE = 55
}

class SpitPoisonAreaComponent extends ServerComponent {
   private trackSource!: AudioBufferSourceNode;
   public sound!: Sound;

   public onLoad(): void {
      const transformComponent = TransformComponentArray.getComponent(this.entity.id);

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

export const SpitPoisonAreaComponentArray = new ComponentArray<SpitPoisonAreaComponent>(ComponentArrayType.server, ServerComponentType.spitPoisonArea, true, {
   onTick: onTick
});

function onTick(spitPoisonAreaComponent: SpitPoisonAreaComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   const hitbox = transformComponent.hitboxes[0];
   const box = hitbox.box as CircularBox;
   const range = box.radius;

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