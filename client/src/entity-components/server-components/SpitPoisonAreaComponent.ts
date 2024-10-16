import { ServerComponentType } from "battletribes-shared/components";
import { playSound, Sound } from "../../sound";
import { Settings } from "battletribes-shared/settings";
import { lerp } from "battletribes-shared/utils";
import { createAcidParticle, createPoisonBubble } from "../../particles";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { TransformComponentArray } from "./TransformComponent";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";

const enum Vars {
   MAX_RANGE = 55
}

class SpitPoisonAreaComponent {
   public trackSource!: AudioBufferSourceNode;
   public sound!: Sound;
}

export default SpitPoisonAreaComponent;

export const SpitPoisonAreaComponentArray = new ServerComponentArray<SpitPoisonAreaComponent>(ServerComponentType.spitPoisonArea, true, {
   onLoad: onLoad,
   onTick: onTick,
   onRemove: onRemove,
   padData: padData,
   updateFromData: updateFromData
});

function onLoad(spitPoisonAreaComponent: SpitPoisonAreaComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   const audioInfo = playSound("acid-burn.mp3", 0.25, 1, transformComponent.position);
   spitPoisonAreaComponent.trackSource = audioInfo.trackSource;
   spitPoisonAreaComponent.sound = audioInfo.sound;

   spitPoisonAreaComponent.trackSource.loop = true;
}

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

function onRemove(entity: EntityID): void {
   const spitPoisonAreaComponent = SpitPoisonAreaComponentArray.getComponent(entity);
   spitPoisonAreaComponent.trackSource.disconnect();
}

function padData(): void {}

function updateFromData(): void {}