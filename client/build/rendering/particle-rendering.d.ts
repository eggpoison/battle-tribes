import ObjectBufferContainer from "./ObjectBufferContainer";
import Particle from "../Particle";
export type ParticleColour = [r: number, g: number, b: number];
export type ParticleTint = [r: number, g: number, b: number];
export declare enum ParticleRenderLayer {
    low = 0,
    high = 1
}
export declare function interpolateColours(startColour: Readonly<ParticleColour>, endColour: Readonly<ParticleColour>, amount: number): ParticleColour;
export declare let lowMonocolourBufferContainer: ObjectBufferContainer;
export declare let highMonocolourBufferContainer: ObjectBufferContainer;
export declare let lowTexturedBufferContainer: ObjectBufferContainer;
export declare let highTexturedBufferContainer: ObjectBufferContainer;
export declare function createParticleShaders(): void;
export declare function addMonocolourParticleToBufferContainer(particle: Particle, renderLayer: ParticleRenderLayer, width: number, height: number, positionX: number, positionY: number, velocityX: number, velocityY: number, accelerationX: number, accelerationY: number, friction: number, rotation: number, angularVelocity: number, angularAcceleration: number, angularFriction: number, colourR: number, colourG: number, colourB: number): void;
export declare function addTexturedParticleToBufferContainer(particle: Particle, renderLayer: ParticleRenderLayer, width: number, height: number, positionX: number, positionY: number, velocityX: number, velocityY: number, accelerationX: number, accelerationY: number, friction: number, rotation: number, angularVelocity: number, angularAcceleration: number, angularFriction: number, textureIndex: number, tintR: number, tintG: number, tintB: number): void;
export declare function renderMonocolourParticles(renderLayer: ParticleRenderLayer): void;
export declare function renderTexturedParticles(renderLayer: ParticleRenderLayer): void;
