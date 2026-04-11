import { Entity, CircularBox, lerp, randAngle, Settings, ServerComponentType } from "webgl-test-shared";
import { playSoundOnHitbox, SoundInfo } from "../../sound";
import { createAcidParticle, createPoisonBubble } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";

const enum Var {
   MAX_RANGE = 55
}

export interface SpitPoisonAreaComponentData {}

export interface SpitPoisonAreaComponent {
   soundInfo: SoundInfo | null;
}

export const SpitPoisonAreaComponentArray = new ServerComponentArray<SpitPoisonAreaComponent, SpitPoisonAreaComponentData, never>(ServerComponentType.spitPoisonArea, true, createComponent, getMaxRenderParts, decodeData);
SpitPoisonAreaComponentArray.onJoin = onJoin;
SpitPoisonAreaComponentArray.onTick = onTick;

function decodeData(): SpitPoisonAreaComponentData {
   return {};
}

function createComponent(): SpitPoisonAreaComponent {
   return {
      soundInfo: null
   };
}

function getMaxRenderParts(): number {
   return 0;
}

// @INCOMPLETE: Won't play when you walk into discovering a previously-offscreen spit poison!
function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const spitPoisonAreaComponent = SpitPoisonAreaComponentArray.getComponent(entity);
   
   spitPoisonAreaComponent.soundInfo = playSoundOnHitbox("acid-burn.mp3", 0.25, 1, entity, hitbox, true);
   // @Temporary @Bug @Hack: FIX
   if (spitPoisonAreaComponent.soundInfo === null) {
      throw new Error();
   }

   spitPoisonAreaComponent.soundInfo.trackSource.loop = true;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const spitPoisonAreaComponent = SpitPoisonAreaComponentArray.getComponent(entity);

   const hitbox = transformComponent.hitboxes[0];
   const box = hitbox.box as CircularBox;
   const range = box.radius;

   if (spitPoisonAreaComponent.soundInfo !== null) {
      spitPoisonAreaComponent.soundInfo.sound.volume = lerp(0.25, 0, 1 - range / Var.MAX_RANGE);
   }

   if (Var.MAX_RANGE * Math.random() < range) {
      // Calculate spawn position
      const offsetMagnitude = range * Math.random();
      const moveDirection = randAngle();
      const spawnPositionX = hitbox.box.position.x + offsetMagnitude * Math.sin(moveDirection);
      const spawnPositionY = hitbox.box.position.y + offsetMagnitude * Math.cos(moveDirection);

      createPoisonBubble(spawnPositionX, spawnPositionY, 1);
   }

   if (Math.random() >= range * range * Settings.DT_S / 5) {
      return;
   }

   const offsetMagnitude = range * Math.random();
   const offsetDirection = randAngle();
   const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);

   createAcidParticle(x, y);
}