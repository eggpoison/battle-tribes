import { CircularBox, randAngle, randFloat, ServerComponentType, PacketReader, Entity, randInt, _point, Settings } from "webgl-test-shared";
import { createSnowParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import Particle from "../../Particle";
import { addMonocolourParticleToBufferContainer, lowMonocolourParticles, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { EntityComponentData } from "../../world";
import { getHitboxVelocity, Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface SnowballComponentData {
   readonly size: number;
}

export interface SnowballComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.snowball, _SnowballComponentArray> {}
}

class _SnowballComponentArray extends _ServerComponentArray<SnowballComponent, SnowballComponentData> {
   public decodeData(reader: PacketReader): SnowballComponentData {
      const size = reader.readNumber();
      return {
         size: size
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const snowballComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.snowball);

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/snowball/size-" + (snowballComponentData.size + 1) + ".png")
         )
      );
   }
      
   public createComponent(): SnowballComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onTick(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      getHitboxVelocity(hitbox);
      const velocity = _point;
      if (velocity.magnitude() > 50) {
         if (tickIntervalHasPassed(0.05 * Settings.TICK_RATE)) {
            createSnowParticle(hitbox.box.position.x, hitbox.box.position.y, randFloat(40, 60));
         }
      }
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      // Create a bunch of snow particles at the point of hit
      const radius = (hitbox.box as CircularBox).radius;
      const numParticles = Math.floor(radius / 3);
      for (let i = 0; i < numParticles; i++) {
         const position = hitbox.box.position.offset(radius, randAngle());
         createSnowSpeckParticle(position.x, position.y);
      }
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
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
}

export const SnowballComponentArray = registerServerComponentArray(ServerComponentType.snowball, _SnowballComponentArray, true);
   
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
   lowMonocolourParticles.push(particle);
}