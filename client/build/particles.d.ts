import { Point } from "webgl-test-shared/dist/utils";
import { CactusFlowerSize } from "webgl-test-shared/dist/entities";
import { ParticleColour, ParticleRenderLayer } from "./rendering/particle-rendering";
import Entity from "./Entity";
export declare enum BloodParticleSize {
    small = 0,
    large = 1
}
export declare function createBloodParticle(size: BloodParticleSize, spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, hasDrag: boolean): void;
export declare function createBloodParticleFountain(entity: Entity, interval: number, speedMultiplier: number): void;
export declare enum LeafParticleSize {
    small = 0,
    large = 1
}
export declare function createLeafParticle(spawnPositionX: number, spawnPositionY: number, moveDirection: number, size: LeafParticleSize): void;
export declare function createFootprintParticle(entity: Entity, numFootstepsTaken: number, footstepOffset: number, size: number, lifetime: number): void;
export declare enum BloodPoolSize {
    small = 0,
    medium = 1,
    large = 2
}
export declare function createBloodPoolParticle(originX: number, originY: number, spawnRange: number): void;
export declare function createRockParticle(spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, renderLayer: ParticleRenderLayer): void;
export declare function createDirtParticle(spawnPositionX: number, spawnPositionY: number): void;
export declare function createSnowParticle(spawnPositionX: number, spawnPositionY: number, moveSpeed: number): void;
export declare function createWhiteSmokeParticle(spawnPositionX: number, spawnPositionY: number, strength: number): void;
export declare function createLeafSpeckParticle(originX: number, originY: number, offset: number, lowColour: Readonly<ParticleColour>, highColour: Readonly<ParticleColour>): void;
export declare function createWoodSpeckParticle(originX: number, originY: number, offset: number): void;
export declare function createRockSpeckParticle(originX: number, originY: number, offset: number, velocityAddX: number, velocityAddY: number, renderLayer: ParticleRenderLayer): void;
export declare function createSlimeSpeckParticle(originX: number, originY: number, spawnOffset: number): void;
export declare function createSlimePoolParticle(originX: number, originY: number, spawnOffsetRange: number): void;
export declare function createWaterSplashParticle(spawnPositionX: number, spawnPositionY: number): void;
export declare function createSmokeParticle(spawnPositionX: number, spawnPositionY: number): void;
export declare function createEmberParticle(spawnPositionX: number, spawnPositionY: number, initialMoveDirection: number, moveSpeed: number): void;
export declare function createPoisonBubble(spawnPositionX: number, spawnPositionY: number, opacity: number): void;
export declare function createFlyParticle(x: number, y: number): void;
export declare function createStarParticle(x: number, y: number): void;
export declare function createMagicParticle(x: number, y: number): void;
export declare function createHealingParticle(position: Point, size: number): void;
export declare function createSnowflakeParticle(x: number, y: number): void;
export declare function createPaperParticle(x: number, y: number): void;
export declare function createFlowerParticle(spawnPositionX: number, spawnPositionY: number, flowerType: number, size: CactusFlowerSize, rotation: number): void;
export declare function createCactusSpineParticle(cactus: Entity, offset: number, flyDirection: number): void;
export declare function createFrostShieldBreakParticle(positionX: number, positionY: number): void;
export declare function createSawdustCloud(x: number, y: number): void;
export declare function createDustCloud(x: number, y: number): void;
export declare function createArrowDestroyParticle(originX: number, originY: number, velocityX: number, velocityY: number): void;
export declare function createBiteParticle(spawnPositionX: number, spawnPositionY: number): void;
export declare function createBlueBloodPoolParticle(originX: number, originY: number, spawnRange: number): void;
export declare function createBlueBloodParticle(size: BloodParticleSize, spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, hasDrag: boolean): void;
export declare function createBlueBloodParticleFountain(entity: Entity, interval: number, speedMultiplier: number): void;
export declare function createWoodShardParticle(originX: number, originY: number, offset: number): void;
export declare function createLightWoodSpeckParticle(originX: number, originY: number, offset: number): void;
export declare function createColouredParticle(x: number, y: number, moveSpeed: number, r: number, g: number, b: number): void;
export declare function createTitleObtainParticle(x: number, y: number, vx: number, vy: number, rotation: number): void;
export declare function createSprintParticle(x: number, y: number, vx: number, vy: number): void;
export declare function createConversionParticle(x: number, y: number, vx: number, vy: number): void;
