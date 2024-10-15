import { BlueprintType, ServerComponentType } from "battletribes-shared/components";
import { assertUnreachable, randFloat, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import ServerComponent from "../ServerComponent";
import { playSound } from "../../sound";
import { createDustCloud, createLightWoodSpeckParticle, createRockParticle, createRockSpeckParticle, createSawdustCloud, createWoodShardParticle } from "../../particles";
import { BLUEPRINT_PROGRESS_TEXTURE_SOURCES, getCurrentBlueprintProgressTexture } from "../../entities/BlueprintEntity";
import { getEntityTextureAtlas, getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { EntityID } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

const createWoodenBlueprintWorkParticleEffects = (entity: EntityID): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   for (let i = 0; i < 2; i++) {
      createWoodShardParticle(transformComponent.position.x, transformComponent.position.y, 24);
   }

   for (let i = 0; i < 3; i++) {
      createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 24 * Math.random());
   }

   for (let i = 0; i < 2; i++) {
      const x = transformComponent.position.x + randFloat(-24, 24);
      const y = transformComponent.position.y + randFloat(-24, 24);
      createSawdustCloud(x, y);
   }
}
/*
// @Incomplete:
make them render on high position
make the origin point for the offset be based on the partial render part (random point in the partial render part)
*/

const createStoneBlueprintWorkParticleEffects = (originX: number, originY: number): void => {
   for (let i = 0; i < 3; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetAmount = 12 * Math.random();
      createRockParticle(originX + offsetAmount * Math.sin(offsetDirection), originY + offsetAmount * Math.cos(offsetDirection), 2 * Math.PI * Math.random(), randFloat(50, 70), ParticleRenderLayer.high);
   }

   for (let i = 0; i < 10; i++) {
      createRockSpeckParticle(originX, originY, 12 * Math.random(), 0, 0, ParticleRenderLayer.high);
   }

   for (let i = 0; i < 2; i++) {
      const x = originX + randFloat(-24, 24);
      const y = originY + randFloat(-24, 24);
      createDustCloud(x, y);
   }
}

class BlueprintComponent extends ServerComponent {
   public readonly partialRenderParts = new Array<TexturedRenderPart>();
   
   public blueprintType: BlueprintType = 0;
   public lastBlueprintProgress = 0;
   public associatedEntityID = 0;
}

export default BlueprintComponent;

export const BlueprintComponentArray = new ServerComponentArray<BlueprintComponent>(ServerComponentType.blueprint, true, {
   onLoad: onLoad,
   onSpawn: onSpawn,
   padData: padData,
   updateFromData: updateFromData
});

function onLoad(blueprintComponent: BlueprintComponent, entity: EntityID): void {
   // Create completed render parts
   const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintComponent.blueprintType];
   const renderInfo = getEntityRenderInfo(entity);
   for (let i = 0; i < progressTextureInfoArray.length; i++) {
      const progressTextureInfo = progressTextureInfoArray[i];

      const renderPart = new TexturedRenderPart(
         null,
         progressTextureInfo.zIndex,
         progressTextureInfo.rotation,
         getTextureArrayIndex(progressTextureInfo.completedTextureSource)
      );
      renderPart.offset.x = progressTextureInfo.offsetX;
      renderPart.offset.y = progressTextureInfo.offsetY;
      renderPart.opacity = 0.5;
      renderPart.tintR = 0.2;
      renderPart.tintG = 0.1;
      renderPart.tintB = 0.8;
      renderInfo.attachRenderThing(renderPart);
   }
}


function onSpawn(_blueprintComponent: BlueprintComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("blueprint-place.mp3", 0.4, 1, transformComponent.position);
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(entity);
   
   blueprintComponent.blueprintType = reader.readNumber();
   const blueprintProgress = reader.readNumber();
   blueprintComponent.associatedEntityID = reader.readNumber();

   if (blueprintProgress !== blueprintComponent.lastBlueprintProgress) {
      const transformComponent = TransformComponentArray.getComponent(entity);

      playSound("blueprint-work.mp3", 0.4, randFloat(0.9, 1.1), transformComponent.position);

      const progressTexture = getCurrentBlueprintProgressTexture(blueprintComponent.blueprintType, blueprintProgress);
      
      // @Cleanup
      const textureAtlas = getEntityTextureAtlas();
      const textureArrayIndex = getTextureArrayIndex(progressTexture.completedTextureSource);
      const xShift = textureAtlas.textureWidths[textureArrayIndex] * 4 * 0.5 * randFloat(-0.75, 0.75);
      const yShift = textureAtlas.textureHeights[textureArrayIndex] * 4 * 0.5 * randFloat(-0.75, 0.75);
      const particleOriginX = transformComponent.position.x + rotateXAroundOrigin(progressTexture.offsetX + xShift, progressTexture.offsetY + yShift, progressTexture.rotation);
      const particleOriginY = transformComponent.position.y + rotateYAroundOrigin(progressTexture.offsetX + xShift, progressTexture.offsetY + yShift, progressTexture.rotation);
      
      // @Incomplete: Change the particle effect type depending on the material of the worked-on partial texture
      // Create particle effects
      switch (blueprintComponent.blueprintType) {
         case BlueprintType.woodenDoor:
         case BlueprintType.woodenEmbrasure:
         case BlueprintType.woodenTunnel:
         case BlueprintType.slingTurret:
         case BlueprintType.ballista:
         case BlueprintType.warriorHutUpgrade:
         case BlueprintType.fenceGate: {
            createWoodenBlueprintWorkParticleEffects(entity);
            break;
         }
         case BlueprintType.stoneDoorUpgrade:
         case BlueprintType.stoneEmbrasure:
         case BlueprintType.stoneEmbrasureUpgrade:
         case BlueprintType.stoneFloorSpikes:
         case BlueprintType.stoneTunnel:
         case BlueprintType.stoneTunnelUpgrade:
         case BlueprintType.stoneWallSpikes:
         case BlueprintType.stoneWall:
         case BlueprintType.stoneDoor: {
            createStoneBlueprintWorkParticleEffects(particleOriginX, particleOriginY);
            break;
         }
         default: {
            assertUnreachable(blueprintComponent.blueprintType);
         }
      }
   }
   blueprintComponent.lastBlueprintProgress = blueprintProgress;
}