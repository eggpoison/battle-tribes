import { CircularBox } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { randAngle, randFloat, randItem } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { createRockParticle, createRockSpeckParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { ROCK_HIT_SOUNDS, ROCK_DESTROY_SOUNDS, playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface BoulderComponentData {
   readonly boulderType: number;
}

export interface BoulderComponent {
   readonly boulderType: number;
}

const TEXTURE_INDEXES = [
   TextureIndex.entities_boulder_boulder1,
   TextureIndex.entities_boulder_boulder2
];

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.boulder, typeof BoulderComponentArray> {}
}

export const BoulderComponentArray = registerServerComponentArray(
   ServerComponentType.boulder,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
BoulderComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BoulderComponentArray.onHit = onHit;
BoulderComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): BoulderComponentData {
   const boulderType = reader.readNumber();
   return {
      boulderType: boulderType
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
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
         TEXTURE_INDEXES[boulderComponentData.boulderType]
      )
   );
}

function createComponent(entityComponentData: EntityComponentData): BoulderComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const boulderComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.boulder);

   return {
      boulderType: boulderComponentData.boulderType
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   const radius = (hitbox.box as CircularBox).radius;
   
   for (let i = 0; i < 2; i++) {
      let moveDirection = randAngle();

      const spawnPositionX = hitbox.box.posX + radius * Math.sin(moveDirection);
      const spawnPositionY = hitbox.box.posY + radius * Math.cos(moveDirection);

      moveDirection += randFloat(-1, 1);

      createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius, 0, 0, ParticleRenderLayer.low);
   }

   playSoundOnHitbox(randItem(ROCK_HIT_SOUNDS), 0.3, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const radius = (hitbox.box as CircularBox).radius;

   for (let i = 0; i < 5; i++) {
      const spawnOffsetMagnitude = radius * Math.random();
      const spawnOffsetDirection = randAngle();
      const spawnPositionX = hitbox.box.posX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.posY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createRockParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 125), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius, 0, 0, ParticleRenderLayer.low);
   }

   playSoundOnHitbox(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, entity, hitbox, false);
}