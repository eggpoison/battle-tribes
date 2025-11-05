import { ServerComponentType } from "webgl-test-shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { addMonocolourParticleToBufferContainer, ParticleColour, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { Entity } from "../../../../../shared/src/entities";
import { randAngle, randFloat, randInt } from "../../../../../shared/src/utils";
import Board from "../../Board";
import Particle from "../../Particle";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface IceSpikesComponentData {}

interface IntermediateInfo {}

export interface IceSpikesComponent {}

const ICE_SPECK_COLOUR: ParticleColour = [140/255, 143/255, 207/255];

const SIZE = 80;

export const IceSpikesComponentArray = new ServerComponentArray<IceSpikesComponent, IceSpikesComponentData, IntermediateInfo>(ServerComponentType.iceSpikes, true, createComponent, getMaxRenderParts, decodeData);
IceSpikesComponentArray.populateIntermediateInfo = populateIntermediateInfo;
IceSpikesComponentArray.onHit = onHit;
IceSpikesComponentArray.onDie = onDie;

function decodeData(): IceSpikesComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(`entities/ice-spikes/ice-spikes.png`)
      )
   );

   return {};
}

function createComponent(): IceSpikesComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

const createIceSpeckProjectile = (hitbox: Hitbox): void => {
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = hitbox.box.position.x + SIZE / 2 * Math.sin(spawnOffsetDirection);
   const spawnPositionY = hitbox.box.position.y + SIZE / 2 * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(150, 300);
   const velocityDirection = spawnOffsetDirection + randFloat(-0.8, 0.8);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   const lifetime = randFloat(0.1, 0.2);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / particle.lifetime, 2);
   }

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      4,
      8,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      velocityDirection,
      0,
      0,
      0,
      ICE_SPECK_COLOUR[0], ICE_SPECK_COLOUR[1], ICE_SPECK_COLOUR[2]
   );
   Board.lowMonocolourParticles.push(particle);
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   // Create ice particles on hit
   for (let i = 0; i < 10; i++) {
      createIceSpeckProjectile(hitbox);
   }
   
   playSoundOnHitbox("ice-spikes-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   for (let i = 0; i < 15; i++) {
      createIceSpeckProjectile(hitbox);
   }
   
   playSoundOnHitbox("ice-spikes-destroy.mp3", 0.4, 1, entity, hitbox, false);
}