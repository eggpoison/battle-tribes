import { Entity, TileType, assert, Point, randInt, Settings } from "webgl-test-shared";
import { getCurrentLayer, getEntityLayer } from "./world";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import Layer from "./Layer";
import { Hitbox } from "./hitboxes";
import { cameraPosition, maxVisibleChunkX, maxVisibleChunkY, minVisibleChunkX, minVisibleChunkY } from "./camera";
import { gameIsFocused } from "./game";

type SoundID = number;

// @Memory
export const ROCK_HIT_SOUNDS: ReadonlyArray<string> = ["rock-hit-1.mp3", "rock-hit-2.mp3", "rock-hit-3.mp3", "rock-hit-4.mp3", "rock-hit-5.mp3", "rock-hit-6.mp3"];
export const ROCK_DESTROY_SOUNDS: ReadonlyArray<string> = ["rock-destroy-1.mp3", "rock-destroy-2.mp3", "rock-destroy-3.mp3"];

let idCounter: SoundID = 0;

let audioContext: AudioContext;
let audioBuffers: Partial<Record<string, AudioBuffer>> = {};

export interface Sound {
   readonly id: SoundID;
   volume: number;
   readonly position: Point;
   readonly gainNode: GainNode;
   isRemoved: boolean;
}

interface SoundAttachInfo {
   readonly sound: Sound;
   readonly isDestroyedWhenEntityIsDestroyed: boolean;
}

// @Cleanup: remove this once the 'attach to world' thing is in place
const activeSounds = new Array<Sound>();
const soundsAttachedToHitboxes = new Map<Hitbox, Array<SoundAttachInfo>>();
const soundToHitboxMap = new Map<Sound, Hitbox | null>();

const soundFiles = import.meta.glob("../sounds/**/*", { eager: true, query: "?url", import: "default" });

// Must be called after a user action
export function createAudioContext(): void {
   audioContext = new AudioContext()
}

// @Squeam
export function getNumSounds(): number {
   return activeSounds.length;
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
      "zombie-dig-1.mp3",
      "zombie-dig-2.mp3",
      "zombie-dig-3.mp3",
      "zombie-dig-4.mp3",
      "zombie-dig-5.mp3",
      "zombie-die-1.mp3",
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
      "stone-destroy-2.mp3",
      "wall-collapse-1.mp3",
      "wall-collapse-2.mp3",
      "wooden-bracings-place.mp3",
      "glurb-hit.mp3",
      "glurb-death.mp3",
      "tree-root-base-hit.mp3",
      "tree-root-base-death.mp3",
      "tree-root-segment-hit.mp3",
      "tree-root-segment-death-1.mp3",
      "tree-root-segment-death-2.mp3",
      "tree-root-segment-death-3.mp3",
      "mithril-hit-1.mp3",
      "mithril-hit-2.mp3",
      "mithril-hit-3.mp3",
      "mithril-death.mp3",
      "automaton-accident-1.mp3",
      "automaton-accident-2.mp3",
      "krumblid-death.mp3",
      "krumblid-hit-flesh-1.mp3",
      "krumblid-hit-flesh-2.mp3",
      "krumblid-hit-shell.mp3",
      "animal-staff-command-follow.mp3",
      "animal-staff-command-move.mp3",
      "animal-staff-command-carry.mp3",
      "animal-staff-command-attack.mp3",
      "mount.mp3",
      "barrel-mount.mp3",
      "dismount.mp3",
      "quiver-pull.mp3",
      "cow-angry.mp3",
      "cow-eat.mp3",
      "desert-plant-hit.mp3",
      "prickly-pear-explode.mp3",
      "prickly-pear-fragment-projectile-explode.mp3",
      "prickly-pear-snap.mp3",
      "dustflea-latch.mp3",
      "dustflea-explosion.mp3",
      "cocoon-break.mp3",
      "tongue-grab.mp3",
      "okren-tongue-launch.mp3",
      "okren-tongue-lick.mp3",
      "dustflea-egg-pop.mp3",
      "okren-eye-hit.mp3",
      "dustflea-hit.mp3",
      "food-burp.mp3",
      "food-munch-1.mp3",
      "food-munch-2.mp3",
      "food-munch-3.mp3",
      "food-munch-4.mp3",
      "food-munch-5.mp3",
      "taming-skill-acquire.mp3",
      "snobe-hit-1.mp3",
      "snobe-hit-2.mp3",
      "snobe-hit-3.mp3",
      "snobe-death-1.mp3",
      "snobe-death-2.mp3",
      "snobe-death-3.mp3",
      "snobe-ambient-1.mp3",
      "snobe-ambient-2.mp3",
      "snobe-ambient-3.mp3",
      "snobe-ambient-4.mp3",
      "wraith-pant-1.mp3",
      "wraith-pant-2.mp3",
      "wraith-pant-3.mp3",
      "wraith-pant-4.mp3",
      "wraith-angry-leap.mp3",
      "ingu-serpent-hit.mp3",
      "ingu-serpent-death.mp3",
      "ingu-serpent-angry-1.mp3",
      "ingu-serpent-angry-2.mp3",
      "ingu-serpent-leap.mp3",
      "tukmok-bone-hit.mp3",
      "tukmok-hit-flesh-1.mp3",
      "tukmok-hit-flesh-2.mp3",
      "tukmok-hit-flesh-3.mp3",
      "tukmok-hit-flesh-4.mp3",
      "tukmok-angry-1.mp3",
      "tukmok-angry-2.mp3",
      "tukmok-angry-3.mp3",
      "tukmok-death.mp3",
      "taming-tier-complete.mp3",
      "lazur.mp3"
   ];

   const audioBufferPromises = AUDIO_FILE_PATHS.map(async (filePath) => {
      const sound = soundFiles["../sounds/" + filePath] as string;
      
      const response = await fetch(sound);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBuffers[filePath] = audioBuffer;
   });

   await Promise.all(audioBufferPromises);
}

const calculateSoundVolume = (volume: number, position: Point): number => {
   // Calculate final volume accounting for distance
   let distanceFromPlayer = cameraPosition.distanceTo(position);
   distanceFromPlayer /= 150;
   if (distanceFromPlayer < 1) {
      distanceFromPlayer = 1;
   }

   // To fix division by 0 errors
   distanceFromPlayer++;

   return volume / (distanceFromPlayer * distanceFromPlayer);
}

const removeSound = (sound: Sound): void => {
   const idx = activeSounds.indexOf(sound);
   if (idx !== -1) {
      activeSounds.splice(idx, 1);
   }

   const hitbox = soundToHitboxMap.get(sound);
   if (typeof hitbox !== "undefined" && hitbox !== null) {
      const attachedSounds = soundsAttachedToHitboxes.get(hitbox);

      // @Hack: shouldn't be necessary
      if (typeof attachedSounds !== "undefined") {
         for (let i = 0; i < attachedSounds.length; i++) {
            const attachInfo = attachedSounds[i];
            if (attachInfo.sound === sound) {
               attachedSounds.splice(i, 1);
               break;
            }
         }
      }
   }

   soundToHitboxMap.delete(sound);
}

export interface SoundInfo {
   readonly trackSource: AudioBufferSourceNode;
   readonly sound: Sound;
}
// @Speed: Garbage collection, unbox the source from a point
export function playSound(filePath: string, volume: number, pitchMultiplier: number, source: Point, layer: Layer): SoundInfo | null {
   // Don't play sounds when the game isn't open because god is that crushing for your mental health. maybe that is an overexaggeration
   if (!gameIsFocused) {
      return null;
   }
   
   // Only play sounds from the current layer
   if (layer !== null && layer !== getCurrentLayer()) {
      return null;
   }

   assert(Number.isFinite(volume));
   
   const audioBuffer = audioBuffers[filePath];
   assert(typeof audioBuffer !== "undefined");

   const gainNode = audioContext.createGain();
   gainNode.gain.value = calculateSoundVolume(volume, source);
   gainNode.connect(audioContext.destination);
   
   const trackSource = audioContext.createBufferSource();
   trackSource.buffer = audioBuffer;
   trackSource.playbackRate.value = pitchMultiplier;
   trackSource.connect(gainNode);

   trackSource.start();

   const sound: Sound = {
      id: idCounter++,
      volume: volume,
      position: source,
      gainNode: gainNode,
      isRemoved: false
   };
   activeSounds.push(sound);

   // @Garbage?
   trackSource.onended = () => {
      sound.isRemoved = true;
   }

   return {
      trackSource: trackSource,
      sound: sound
   };
}

/** Plays a sound which is not embodied in the world and exists only to the playing player. */
export function playHeadSound(filePath: string, volume: number, pitchMultiplier: number): SoundInfo | null {
   // @HACK @HACK @HACK @BUG this isn't actually disembodied and absolute / attached to camera and if the player moves or changes layers it will decrease in volume D:
   return playSound(filePath, volume, pitchMultiplier, cameraPosition.copy(), getCurrentLayer());
}

// @Cleanup: Make this return the sound info. and make it so that the sound info is guaranteed. so if it starts in wrong layer it still plays if it goes to correct layer
export function playSoundOnHitbox(filePath: string, volume: number, pitchMultiplier: number, entity: Entity, hitbox: Hitbox, isDestroyedWhenEntityIsDestroyed: boolean): SoundInfo | null {
   // @Incomplete: use render position
   const soundInfo = playSound(filePath, volume, pitchMultiplier, hitbox.box.position.copy(), getEntityLayer(entity));
   
   if (soundInfo !== null) {
      soundToHitboxMap.set(soundInfo.sound, hitbox);
      
      if (!soundsAttachedToHitboxes.has(hitbox)) {
         soundsAttachedToHitboxes.set(hitbox, []);
      }

      const attachInfo: SoundAttachInfo = {
         sound: soundInfo.sound,
         isDestroyedWhenEntityIsDestroyed: isDestroyedWhenEntityIsDestroyed
      };
      
      const hitboxAttachedSounds = soundsAttachedToHitboxes.get(hitbox)!;
      hitboxAttachedSounds.push(attachInfo);
   }

   return soundInfo;
}

export function removeEntitySounds(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const hitbox of transformComponent.hitboxes) {
      const entityAttachedSounds = soundsAttachedToHitboxes.get(hitbox)!;
      if (typeof entityAttachedSounds === "undefined") {
         return;
      }
   
      for (const attachInfo of entityAttachedSounds) {
         if (attachInfo.isDestroyedWhenEntityIsDestroyed) {
            removeSound(attachInfo.sound);
         } else {
            soundToHitboxMap.delete(attachInfo.sound);
         }
      }
   
      soundsAttachedToHitboxes.delete(hitbox);
   }
}

export function updateSounds(): void {
   for (const pair of soundsAttachedToHitboxes) {
      const hitbox = pair[0];
      const hitboxAttachedSounds = pair[1];
      
      for (let i = 0; i < hitboxAttachedSounds.length; i++) {
         const attachInfo = hitboxAttachedSounds[i];
         const sound = attachInfo.sound;
         
         sound.position.x = hitbox.box.position.x;
         sound.position.y = hitbox.box.position.y;
      }
   }
   
   for (let i = 0; i < activeSounds.length; i++) {
      const sound = activeSounds[i];

      if (sound.isRemoved) {
         removeSound(sound);
         i--;
      } else {
         // @HACK to find out why this is crashing and idk why
         assert(Number.isFinite(sound.volume));
         sound.gainNode.gain.value = calculateSoundVolume(sound.volume, sound.position);
      }
   }
}

// @Hack: There should really be unique sounds for each entity type, not one generic sound.
export function playBuildingHitSound(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("building-hit-" + randInt(1, 2) + ".mp3", 0.2, 1, entity, hitbox, false);
}

export function playRiverSounds(): void {
   const layer = getCurrentLayer();
   
   // @INCOMPLETE: This should be a square- even circular check, not a rectangular one. Otherwise some tiles might have potential to make sound to the left and right, but not top and bottom.
   const minTileX = minVisibleChunkX * Settings.CHUNK_SIZE;
   const maxTileX = (maxVisibleChunkX + 1) * Settings.CHUNK_SIZE - 1;
   const minTileY = minVisibleChunkY * Settings.CHUNK_SIZE;
   const maxTileY = (maxVisibleChunkY + 1) * Settings.CHUNK_SIZE - 1;
   
   // Calculate the number of random checks to conduct
   const width = maxTileX - minTileX;
   const height = maxTileY - minTileY;
   let numSamples = width * height * 0.1 * Settings.DT_S;
   if (Math.random() < numSamples % 1) {
      numSamples = Math.ceil(numSamples);
   } else {
      numSamples = Math.floor(numSamples);
   }

   for (let i = 0; i < numSamples; i++) {
      const tileX = randInt(minTileX, maxTileX);
      const tileY = randInt(minTileY, maxTileY);
      const tile = layer.getTileFromCoords(tileX, tileY);
      if (tile === null) {
         throw new Error();
      }

      if (tile.type === TileType.water && Math.random() < 0.1 * Settings.DT_S) {
         const flowDirection = layer.getRiverFlowDirection(tileX, tileY);
         if (flowDirection > 0) {
            const x = (tileX + Math.random()) * Settings.TILE_SIZE;
            const y = (tileY + Math.random()) * Settings.TILE_SIZE;
            playSound("water-flowing-" + randInt(1, 4) + ".mp3", 0.2, 1, new Point(x, y), layer);
         }
      }
   }
}