import { randAngle, randFloat, randInt, Entity, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { addMonocolourParticleToBufferContainer, lowMonocolourParticles, ParticleColour, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import Particle from "../../Particle";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface IceSpikesComponentData {}

export interface IceSpikesComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.iceSpikes, _IceSpikesComponentArray, IceSpikesComponentData> {}
}

const ICE_SPECK_COLOUR: ParticleColour = [140/255, 143/255, 207/255];

const SIZE = 80;

class _IceSpikesComponentArray extends _ServerComponentArray<IceSpikesComponent, IceSpikesComponentData> {
   public decodeData(): IceSpikesComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex(`entities/ice-spikes/ice-spikes.png`)
         )
      );
   }

   public createComponent(): IceSpikesComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      // Create ice particles on hit
      for (let i = 0; i < 10; i++) {
         createIceSpeckProjectile(hitbox);
      }
      
      playSoundOnHitbox("ice-spikes-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      for (let i = 0; i < 15; i++) {
         createIceSpeckProjectile(hitbox);
      }
      
      playSoundOnHitbox("ice-spikes-destroy.mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const IceSpikesComponentArray = registerServerComponentArray(ServerComponentType.iceSpikes, _IceSpikesComponentArray, true);

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
   lowMonocolourParticles.push(particle);
}