import { CircularBox, randAngle, randFloat, randItem, Entity, ServerComponentType, PacketReader } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { getTextureArrayIndex } from "../../texture-atlases";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { createRockParticle, createRockSpeckParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { ROCK_HIT_SOUNDS, ROCK_DESTROY_SOUNDS, playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface BoulderComponentData {
   readonly boulderType: number;
}

export interface BoulderComponent {
   readonly boulderType: number;
}

const TEXTURE_SOURCES = [
   "entities/boulder/boulder1.png",
   "entities/boulder/boulder2.png"
];

class _BoulderComponentArray extends ServerComponentArray<BoulderComponent, BoulderComponentData> {
   public decodeData(reader: PacketReader): BoulderComponentData {
      const boulderType = reader.readNumber();
      return {
         boulderType: boulderType
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const boulderComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.boulder);
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex(TEXTURE_SOURCES[boulderComponentData.boulderType])
         )
      );
   }

   public createComponent(entityComponentData: EntityComponentData): BoulderComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const boulderComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.boulder);

      return {
         boulderType: boulderComponentData.boulderType
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      const radius = (hitbox.box as CircularBox).radius;
      
      for (let i = 0; i < 2; i++) {
         let moveDirection = randAngle();

         const spawnPositionX = hitbox.box.position.x + radius * Math.sin(moveDirection);
         const spawnPositionY = hitbox.box.position.y + radius * Math.cos(moveDirection);

         moveDirection += randFloat(-1, 1);

         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius, 0, 0, ParticleRenderLayer.low);
      }

      playSoundOnHitbox(randItem(ROCK_HIT_SOUNDS), 0.3, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      const radius = (hitbox.box as CircularBox).radius;

      for (let i = 0; i < 5; i++) {
         const spawnOffsetMagnitude = radius * Math.random();
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createRockParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius, 0, 0, ParticleRenderLayer.low);
      }

      playSoundOnHitbox(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, entity, hitbox, false);
   }
}

export const BoulderComponentArray = registerServerComponentArray(ServerComponentType.boulder, _BoulderComponentArray, true);