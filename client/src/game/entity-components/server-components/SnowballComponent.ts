import { Entity } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { randAngle, randFloat, randInt } from "battletribes-shared/utils";
import Board from "../../Board";
import { createSnowParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import Particle from "../../Particle";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { EntityComponentData } from "../../world";
import { getHitboxVelocity, Hitbox } from "../../hitboxes";
import CircularBox from "../../../../../shared/src/boxes/CircularBox";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { tickIntervalHasPassed } from "../../client";

export interface SnowballComponentData {
   readonly size: number;
}

interface IntermediateInfo {}

export interface SnowballComponent {}

export const SnowballComponentArray = new ServerComponentArray<SnowballComponent, SnowballComponentData, IntermediateInfo>(ServerComponentType.snowball, true, createComponent, getMaxRenderParts, decodeData);
SnowballComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SnowballComponentArray.onTick = onTick;
SnowballComponentArray.onHit = onHit;
SnowballComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): SnowballComponentData {
   const size = reader.readNumber();
   return {
      size: size
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const snowballComponentData = entityComponentData.serverComponentData[ServerComponentType.snowball]!;

   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/snowball/size-" + (snowballComponentData.size + 1) + ".png")
      )
   );

   return {};
}
   
function createComponent(): SnowballComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity)!;
   const hitbox = transformComponent.hitboxes[0];
   const velocity = getHitboxVelocity(hitbox);
   if (velocity.magnitude() > 50) {
      if (tickIntervalHasPassed(0.05)) {
         createSnowParticle(hitbox.box.position.x, hitbox.box.position.y, randFloat(40, 60));
      }
   }
}
   
const createSnowSpeckParticle = (spawnPositionX: number, spawnPositionY: number): void => {
   const lifetime = randFloat(0.3, 0.4);

   const pixelSize = randInt(4, 8);

   const velocityMagnitude = randFloat(40, 80);
   const velocityDirection = randAngle();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const colour = randFloat(0.7, 0.95);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.2,
      randAngle(),
      0,
      0,
      0,
      colour, colour, colour
   );
   Board.lowMonocolourParticles.push(particle);
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   // Create a bunch of snow particles at the point of hit
   const radius = (hitbox.box as CircularBox).radius;
   const numParticles = Math.floor(radius / 3);
   for (let i = 0; i < numParticles; i++) {
      const position = hitbox.box.position.offset(radius, randAngle());
      createSnowSpeckParticle(position.x, position.y);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity)!;
   const hitbox = transformComponent.hitboxes[0];

   // Create a bunch of snow particles throughout the snowball
   const radius = (hitbox.box as CircularBox).radius;
   const numParticles = Math.floor(radius / 1.2);
   for (let i = 0; i < numParticles; i++) {
      const offsetDirection = randAngle();
      const spawnPositionX = hitbox.box.position.x + radius * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + radius * Math.cos(offsetDirection);
      createSnowSpeckParticle(spawnPositionX, spawnPositionY);
   }
}