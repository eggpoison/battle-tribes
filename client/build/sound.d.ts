import Entity from "./Entity";
declare const AUDIO_FILE_PATHS: readonly ["item-pickup.mp3", "rock-hit-1.mp3", "rock-hit-2.mp3", "rock-hit-3.mp3", "rock-hit-4.mp3", "rock-hit-5.mp3", "rock-hit-6.mp3", "rock-destroy-1.mp3", "rock-destroy-2.mp3", "rock-destroy-3.mp3", "tree-hit-1.mp3", "tree-hit-2.mp3", "tree-hit-3.mp3", "tree-hit-4.mp3", "tree-destroy-1.mp3", "tree-destroy-2.mp3", "tree-destroy-3.mp3", "tree-destroy-4.mp3", "goblin-hurt-1.mp3", "goblin-hurt-2.mp3", "goblin-hurt-3.mp3", "goblin-hurt-4.mp3", "goblin-hurt-5.mp3", "goblin-die-1.mp3", "goblin-die-2.mp3", "goblin-die-3.mp3", "goblin-die-4.mp3", "goblin-angry-1.mp3", "goblin-angry-2.mp3", "goblin-angry-3.mp3", "goblin-angry-4.mp3", "goblin-escape-1.mp3", "goblin-escape-2.mp3", "goblin-escape-3.mp3", "goblin-ambient-1.mp3", "goblin-ambient-2.mp3", "goblin-ambient-3.mp3", "goblin-ambient-4.mp3", "goblin-ambient-5.mp3", "plainsperson-hurt-1.mp3", "plainsperson-hurt-2.mp3", "plainsperson-hurt-3.mp3", "plainsperson-die-1.mp3", "barbarian-hurt-1.mp3", "barbarian-hurt-2.mp3", "barbarian-hurt-3.mp3", "barbarian-die-1.mp3", "barbarian-ambient-1.mp3", "barbarian-ambient-2.mp3", "barbarian-angry-1.mp3", "sand-walk-1.mp3", "sand-walk-2.mp3", "sand-walk-3.mp3", "sand-walk-4.mp3", "rock-walk-1.mp3", "rock-walk-2.mp3", "rock-walk-3.mp3", "rock-walk-4.mp3", "zombie-ambient-1.mp3", "zombie-ambient-2.mp3", "zombie-ambient-3.mp3", "zombie-hurt-1.mp3", "zombie-hurt-2.mp3", "zombie-hurt-3.mp3", "zombie-die-1.mp3", "zombie-dig-2.mp3", "zombie-dig-3.mp3", "zombie-dig-4.mp3", "zombie-dig-5.mp3", "cow-ambient-1.mp3", "cow-ambient-2.mp3", "cow-ambient-3.mp3", "cow-hurt-1.mp3", "cow-hurt-2.mp3", "cow-hurt-3.mp3", "cow-die-1.mp3", "grass-walk-1.mp3", "grass-walk-2.mp3", "grass-walk-3.mp3", "grass-walk-4.mp3", "snow-walk-1.mp3", "snow-walk-2.mp3", "snow-walk-3.mp3", "building-hit-1.mp3", "building-hit-2.mp3", "building-destroy-1.mp3", "water-flowing-1.mp3", "water-flowing-2.mp3", "water-flowing-3.mp3", "water-flowing-4.mp3", "water-splash-1.mp3", "water-splash-2.mp3", "water-splash-3.mp3", "berry-bush-hit-1.mp3", "berry-bush-hit-2.mp3", "berry-bush-hit-3.mp3", "berry-bush-destroy-1.mp3", "fish-hurt-1.mp3", "fish-hurt-2.mp3", "fish-hurt-3.mp3", "fish-hurt-4.mp3", "fish-die-1.mp3", "ice-spikes-hit-1.mp3", "ice-spikes-hit-2.mp3", "ice-spikes-hit-3.mp3", "ice-spikes-destroy.mp3", "door-open.mp3", "door-close.mp3", "slime-spit.mp3", "acid-burn.mp3", "air-whoosh.mp3", "arrow-hit.mp3", "spear-hit.mp3", "bow-fire.mp3", "reinforced-bow-fire.mp3", "freezing.mp3", "ice-bow-fire.mp3", "crossbow-load.mp3", "craft.mp3", "wooden-wall-break.mp3", "wooden-wall-hit.mp3", "wooden-wall-place.mp3", "structure-shaping.mp3", "spear-throw.mp3", "bow-charge.mp3", "crossbow-fire.mp3", "blueprint-place.mp3", "blueprint-work.mp3", "wooden-spikes-destroy.mp3", "wooden-spikes-hit.mp3", "spike-stab.mp3", "repair.mp3", "orb-complete.mp3", "sling-turret-fire.mp3", "ice-break.mp3", "spike-place.mp3", "flies.mp3", "cactus-hit.mp3", "cactus-destroy.mp3", "barrel-place.mp3", "error.mp3", "conversion.mp3", "plant.mp3"];
export type AudioFilePath = typeof AUDIO_FILE_PATHS[number];
export declare const ROCK_HIT_SOUNDS: ReadonlyArray<AudioFilePath>;
export declare const ROCK_DESTROY_SOUNDS: ReadonlyArray<AudioFilePath>;
export interface Sound {
    volume: number;
    x: number;
    y: number;
    readonly gainNode: GainNode;
}
export declare function createAudioContext(): void;
export declare function setupAudio(): Promise<void>;
export interface SoundInfo {
    readonly trackSource: AudioBufferSourceNode;
    readonly sound: Sound;
}
export declare function playSound(filePath: AudioFilePath, volume: number, pitchMultiplier: number, sourceX: number, sourceY: number): SoundInfo;
export declare function attachSoundToEntity(sound: Sound, entity: Entity): void;
export declare function updateSoundEffectVolumes(): void;
export declare function playBuildingHitSound(sourceX: number, sourceY: number): void;
export declare function playRiverSounds(): void;
export {};
