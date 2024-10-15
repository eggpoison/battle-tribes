import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import { TileType } from "battletribes-shared/tiles";
import Camera from "./Camera";
import { getCurrentLayer } from "./world";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { EntityID } from "../../shared/src/entities";

// @Memory
export const ROCK_HIT_SOUNDS: ReadonlyArray<string> = ["rock-hit-1.mp3", "rock-hit-2.mp3", "rock-hit-3.mp3", "rock-hit-4.mp3", "rock-hit-5.mp3", "rock-hit-6.mp3"];
export const ROCK_DESTROY_SOUNDS: ReadonlyArray<string> = ["rock-destroy-1.mp3", "rock-destroy-2.mp3", "rock-destroy-3.mp3"];

let audioContext: AudioContext;
let audioBuffers: Record<string, AudioBuffer>;

export interface Sound {
   volume: number;
   readonly position: Point;
   readonly gainNode: GainNode;
}

interface SoundAttachInfo {
   readonly sound: Sound;
   readonly entity: EntityID;
}

const activeSounds = new Array<Sound>();
const entityAttachedSounds = new Array<SoundAttachInfo>();

// Must be called after a user action
export function createAudioContext(): void {
   audioContext = new AudioContext()
}

// @Hack: For some reason if we decode the audio too fast, then shit breaks. So we have to do this evilness. Why? Because god is not real.
// await (new Promise<void>(resolve => {
//    setTimeout(() => {
//       resolve();
//    }, 20)
// }));

export async function loadSoundEffects(): Promise<void> {
   const AUDIO_FILE_PATHS = [
      "item-pickup.mp3",
      "rock-hit-1.mp3",
      "rock-hit-2.mp3",
      "rock-hit-3.mp3",
      "rock-hit-4.mp3",
      "rock-hit-5.mp3",
      "rock-hit-6.mp3",
      "rock-destroy-1.mp3",
      "rock-destroy-2.mp3",
      "rock-destroy-3.mp3",
      "tree-hit-1.mp3",
      "tree-hit-2.mp3",
      "tree-hit-3.mp3",
      "tree-hit-4.mp3",
      "tree-destroy-1.mp3",
      "tree-destroy-2.mp3",
      "tree-destroy-3.mp3",
      "tree-destroy-4.mp3",
      "goblin-hurt-1.mp3",
      "goblin-hurt-2.mp3",
      "goblin-hurt-3.mp3",
      "goblin-hurt-4.mp3",
      "goblin-hurt-5.mp3",
      "goblin-die-1.mp3",
      "goblin-die-2.mp3",
      "goblin-die-3.mp3",
      "goblin-die-4.mp3",
      "goblin-angry-1.mp3",
      "goblin-angry-2.mp3",
      "goblin-angry-3.mp3",
      "goblin-angry-4.mp3",
      "goblin-escape-1.mp3",
      "goblin-escape-2.mp3",
      "goblin-escape-3.mp3",
      "goblin-ambient-1.mp3",
      "goblin-ambient-2.mp3",
      "goblin-ambient-3.mp3",
      "goblin-ambient-4.mp3",
      "goblin-ambient-5.mp3",
      "plainsperson-hurt-1.mp3",
      "plainsperson-hurt-2.mp3",
      "plainsperson-hurt-3.mp3",
      "plainsperson-die-1.mp3",
      "barbarian-hurt-1.mp3",
      "barbarian-hurt-2.mp3",
      "barbarian-hurt-3.mp3",
      "barbarian-die-1.mp3",
      "barbarian-ambient-1.mp3",
      "barbarian-ambient-2.mp3",
      "barbarian-angry-1.mp3",
      "sand-walk-1.mp3",
      "sand-walk-2.mp3",
      "sand-walk-3.mp3",
      "sand-walk-4.mp3",
      "rock-walk-1.mp3",
      "rock-walk-2.mp3",
      "rock-walk-3.mp3",
      "rock-walk-4.mp3",
      "zombie-ambient-1.mp3",
      "zombie-ambient-2.mp3",
      "zombie-ambient-3.mp3",
      "zombie-hurt-1.mp3",
      "zombie-hurt-2.mp3",
      "zombie-hurt-3.mp3",
      "zombie-die-1.mp3",
      "zombie-dig-2.mp3",
      "zombie-dig-3.mp3",
      "zombie-dig-4.mp3",
      "zombie-dig-5.mp3",
      "cow-ambient-1.mp3",
      "cow-ambient-2.mp3",
      "cow-ambient-3.mp3",
      "cow-hurt-1.mp3",
      "cow-hurt-2.mp3",
      "cow-hurt-3.mp3",
      "cow-die-1.mp3",
      "grass-walk-1.mp3",
      "grass-walk-2.mp3",
      "grass-walk-3.mp3",
      "grass-walk-4.mp3",
      "snow-walk-1.mp3",
      "snow-walk-2.mp3",
      "snow-walk-3.mp3",
      "building-hit-1.mp3",
      "building-hit-2.mp3",
      "building-destroy-1.mp3",
      "water-flowing-1.mp3",
      "water-flowing-2.mp3",
      "water-flowing-3.mp3",
      "water-flowing-4.mp3",
      "water-splash-1.mp3",
      "water-splash-2.mp3",
      "water-splash-3.mp3",
      "berry-bush-hit-1.mp3",
      "berry-bush-hit-2.mp3",
      "berry-bush-hit-3.mp3",
      "berry-bush-destroy-1.mp3",
      "fish-hurt-1.mp3",
      "fish-hurt-2.mp3",
      "fish-hurt-3.mp3",
      "fish-hurt-4.mp3",
      "fish-die-1.mp3",
      "ice-spikes-hit-1.mp3",
      "ice-spikes-hit-2.mp3",
      "ice-spikes-hit-3.mp3",
      "ice-spikes-destroy.mp3",
      "door-open.mp3",
      "door-close.mp3",
      "slime-spit.mp3",
      "acid-burn.mp3",
      "air-whoosh.mp3",
      "arrow-hit.mp3",
      "spear-hit.mp3",
      "bow-fire.mp3",
      "reinforced-bow-fire.mp3",
      "freezing.mp3",
      "ice-bow-fire.mp3",
      "crossbow-load.mp3",
      "craft.mp3",
      "wooden-wall-break.mp3",
      "wooden-wall-hit.mp3",
      "wooden-wall-place.mp3",
      "structure-shaping.mp3",
      "spear-throw.mp3",
      "bow-charge.mp3",
      "crossbow-fire.mp3",
      "blueprint-place.mp3",
      "blueprint-work.mp3",
      "wooden-spikes-destroy.mp3",
      "wooden-spikes-hit.mp3",
      "spike-stab.mp3",
      "repair.mp3",
      "orb-complete.mp3",
      "sling-turret-fire.mp3",
      "ice-break.mp3",
      "spike-place.mp3",
      "flies.mp3",
      "cactus-hit.mp3",
      "cactus-destroy.mp3",
      "barrel-place.mp3",
      "error.mp3",
      "conversion.mp3",
      "plant.mp3",
      "slime-hit-1.mp3",
      "slime-hit-2.mp3",
      "slime-death.mp3",
      "golem-angry.mp3",
      "slime-ambient-1.mp3",
      "slime-ambient-2.mp3",
      "slime-ambient-3.mp3",
      "slime-ambient-4.mp3",
      "fart.mp3",
      "trap-spring.mp3",
      "trap-cover.mp3",
      "fertiliser.mp3",
      "item-research.mp3",
      "research.mp3",
      "research-forbidden.mp3",
      "frostling-hurt-1.mp3",
      "frostling-hurt-2.mp3",
      "frostling-hurt-3.mp3",
      "frostling-hurt-4.mp3",
      "frostling-die.mp3",
      "block.mp3",
      "shield-block.mp3",
      "yeti-ambient-1.mp3",
      "yeti-ambient-2.mp3",
      "yeti-ambient-3.mp3",
      "yeti-ambient-4.mp3",
      "yeti-ambient-5.mp3",
      "yeti-ambient-6.mp3",
      "yeti-angry-1.mp3",
      "yeti-angry-2.mp3",
      "yeti-angry-3.mp3",
      "yeti-angry-4.mp3",
      "yeti-angry-5.mp3",
      "yeti-death-1.mp3",
      "yeti-death-2.mp3",
      "yeti-hurt-1.mp3",
      "yeti-hurt-2.mp3",
      "yeti-hurt-3.mp3",
      "yeti-hurt-4.mp3",
      "yeti-hurt-5.mp3",
      "layer-change.mp3",
      "guardian-rock-smash-charge.mp3",
      "guardian-rock-smash-impact.mp3",
      "guardian-rock-smash-start.mp3",
      "guardian-rock-burst.mp3",
      "guardian-rock-burst-charge.mp3",
      "guardian-gem-fragment-death.mp3",
      "guardian-spiky-ball-spawn.mp3",
      "guardian-spiky-ball-death.mp3",
      "guardian-summon-focus.mp3",
      "stone-mine-1.mp3",
      "stone-mine-2.mp3",
      "stone-mine-3.mp3",
      "stone-mine-4.mp3",
      "stone-destroy-1.mp3",
      "stone-destroy-2.mp3"
   ];

   const tempAudioBuffers: Partial<Record<string, AudioBuffer>> = {};
   
   const audioBufferPromises = AUDIO_FILE_PATHS.map(async (filePath) => {
      const response = await fetch(require("./sounds/" + filePath));
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      tempAudioBuffers[filePath] = audioBuffer;
   });

   await Promise.all(audioBufferPromises);
   
   audioBuffers = tempAudioBuffers as Record<string, AudioBuffer>;
}

const calculateSoundVolume = (volume: number, position: Point): number => {
   // Calculate final volume accounting for distance
   let distanceFromPlayer = Camera.position.calculateDistanceBetween(position);
   distanceFromPlayer /= 150;
   if (distanceFromPlayer < 1) {
      distanceFromPlayer = 1;
   }

   // To fix division by 0 errors
   distanceFromPlayer++;

   return volume / (distanceFromPlayer * distanceFromPlayer);
}

export interface SoundInfo {
   readonly trackSource: AudioBufferSourceNode;
   readonly sound: Sound;
}
// @Speed: Garbage collection, unbox the source from a point
export function playSound(filePath: string, volume: number, pitchMultiplier: number, source: Point): SoundInfo {
   const audioBuffer = audioBuffers[filePath];

   const gainNode = audioContext.createGain();
   gainNode.gain.value = calculateSoundVolume(volume, source);
   gainNode.connect(audioContext.destination);
   
   const trackSource = audioContext.createBufferSource();
   trackSource.buffer = audioBuffer;
   trackSource.playbackRate.value = pitchMultiplier;
   trackSource.connect(gainNode);

   trackSource.start();

   const soundInfo: Sound = {
      volume: volume,
      position: source,
      gainNode: gainNode
   };
   activeSounds.push(soundInfo);

   trackSource.onended = () => {
      const idx = activeSounds.indexOf(soundInfo);
      if (idx !== -1) {
         activeSounds.splice(idx, 1);
      }
      
      for (let i = 0; i < entityAttachedSounds.length; i++) {
         const attachedSoundInfo = entityAttachedSounds[i];
         if (attachedSoundInfo.sound === soundInfo) {
            entityAttachedSounds.splice(i, 1);
            break;
         }
      }
   }

   return {
      trackSource: trackSource,
      sound: soundInfo
   };
}

export function attachSoundToEntity(sound: Sound, entity: EntityID): void {
   entityAttachedSounds.push({
      sound: sound,
      entity: entity
   });
}

export function updateSoundEffectVolumes(): void {
   for (let i = 0; i < entityAttachedSounds.length; i++) {
      const attachedSoundInfo = entityAttachedSounds[i];

      const transformComponent = TransformComponentArray.getComponent(attachedSoundInfo.entity);

      attachedSoundInfo.sound.position.x = transformComponent.position.x;
      attachedSoundInfo.sound.position.y = transformComponent.position.y;
   }
   
   for (let i = 0; i < activeSounds.length; i++) {
      const sound = activeSounds[i];
      sound.gainNode.gain.value = calculateSoundVolume(sound.volume, sound.position);
   }
}

export function playBuildingHitSound(source: Point): void {
   playSound("building-hit-" + randInt(1, 2) + ".mp3", 0.2, 1, source);
}

export function playRiverSounds(): void {
   const layer = getCurrentLayer();
   
   const minTileX = Camera.minVisibleChunkX * Settings.CHUNK_SIZE;
   const maxTileX = (Camera.maxVisibleChunkX + 1) * Settings.CHUNK_SIZE - 1;
   const minTileY = Camera.minVisibleChunkY * Settings.CHUNK_SIZE;
   const maxTileY = (Camera.maxVisibleChunkY + 1) * Settings.CHUNK_SIZE - 1;

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = layer.getTileFromCoords(tileX, tileY);
         if (tile === null) {
            continue;
         }

         if (tile.type === TileType.water && Math.random() < 0.1 / Settings.TPS) {
            const x = (tileX + Math.random()) * Settings.TILE_SIZE;
            const y = (tileY + Math.random()) * Settings.TILE_SIZE;
            playSound("water-flowing-" + randInt(1, 4) + ".mp3", 0.2, 1, new Point(x, y));
         }
      }
   }
}