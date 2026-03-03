import { CircularBox, randAngle, randFloat, randItem, Entity, ServerComponentType, PacketReader } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { createRockParticle, createRockSpeckParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { ROCK_HIT_SOUNDS, ROCK_DESTROY_SOUNDS, playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface BoulderComponentData {
   readonly boulderType: number;
}

interface IntermediateInfo {}

export interface BoulderComponent {
   readonly boulderType: number;
}

const TEXTURE_SOURCES = [
   "entities/boulder/boulder1.png",
   "entities/boulder/boulder2.png"
];

export const BoulderComponentArray = new ServerComponentArray<BoulderComponent, BoulderComponentData, IntermediateInfo>(ServerComponentType.boulder, true, createComponent, getMaxRenderParts, decodeData);
BoulderComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BoulderComponentArray.onHit = onHit;
BoulderComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): BoulderComponentData {
   const boulderType = reader.readNumber();
   return {
      boulderType: boulderType
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const boulderComponentData = entityComponentData.serverComponentData.get(ServerComponentType.boulder)!;
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(TEXTURE_SOURCES[boulderComponentData.boulderType])
      )
   );

   return {};
}

function createComponent(entityComponentData: EntityComponentData): BoulderComponent {
   return {
      boulderType: entityComponentData.serverComponentData.get(ServerComponentType.boulder)!.boulderType
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
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

function onDie(entity: Entity): void {
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