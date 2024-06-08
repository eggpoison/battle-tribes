import { BlueprintComponentData, BlueprintType, ServerComponentType } from "webgl-test-shared/dist/components";
import { assertUnreachable, randFloat, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import RenderPart from "../render-parts/RenderPart";
import Entity from "../Entity";
import { playSound } from "../sound";
import { createDustCloud, createLightWoodSpeckParticle, createRockParticle, createRockSpeckParticle, createSawdustCloud, createWoodShardParticle } from "../particles";
import { getCurrentBlueprintProgressTexture } from "../entities/BlueprintEntity";
import { getEntityTextureAtlas, getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";

const createWoodenBlueprintWorkParticleEffects = (entity: Entity): void => {
   for (let i = 0; i < 2; i++) {
      createWoodShardParticle(entity.position.x, entity.position.y, 24);
   }

   for (let i = 0; i < 3; i++) {
      createLightWoodSpeckParticle(entity.position.x, entity.position.y, 24 * Math.random());
   }

   for (let i = 0; i < 2; i++) {
      const x = entity.position.x + randFloat(-24, 24);
      const y = entity.position.y + randFloat(-24, 24);
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

class BlueprintComponent extends ServerComponent<ServerComponentType.blueprint> {
   public readonly partialRenderParts = new Array<RenderPart>();
   
   public readonly blueprintType: BlueprintType;
   public lastBlueprintProgress: number;
   public readonly associatedEntityID: number;

   constructor(entity: Entity, data: BlueprintComponentData) {
      super(entity);

      this.blueprintType = data.blueprintType;
      this.lastBlueprintProgress = data.buildProgress;
      this.associatedEntityID = data.associatedEntityID;
   }

   public updateFromData(data: BlueprintComponentData): void {
      const blueprintProgress = data.buildProgress;

      if (blueprintProgress !== this.lastBlueprintProgress) {
         playSound("blueprint-work.mp3", 0.4, randFloat(0.9, 1.1), this.entity.position.x, this.entity.position.y);

         const progressTexture = getCurrentBlueprintProgressTexture(data.blueprintType, data.buildProgress);
         
         // @Cleanup
         const textureAtlas = getEntityTextureAtlas();
         const textureArrayIndex = getTextureArrayIndex(progressTexture.completedTextureSource);
         const xShift = textureAtlas.textureWidths[textureArrayIndex] * 4 * 0.5 * randFloat(-0.75, 0.75);
         const yShift = textureAtlas.textureHeights[textureArrayIndex] * 4 * 0.5 * randFloat(-0.75, 0.75);
         const particleOriginX = this.entity.position.x + rotateXAroundOrigin(progressTexture.offsetX + xShift, progressTexture.offsetY + yShift, progressTexture.rotation);
         const particleOriginY = this.entity.position.y + rotateYAroundOrigin(progressTexture.offsetX + xShift, progressTexture.offsetY + yShift, progressTexture.rotation);
         
         // @Incomplete: Change the particle effect type depending on the material of the worked-on partial texture
         // Create particle effects
         switch (this.blueprintType) {
            case BlueprintType.woodenDoor:
            case BlueprintType.woodenEmbrasure:
            case BlueprintType.woodenTunnel:
            case BlueprintType.slingTurret:
            case BlueprintType.ballista:
            case BlueprintType.warriorHutUpgrade:
            case BlueprintType.fenceGate: {
               createWoodenBlueprintWorkParticleEffects(this.entity);
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
               assertUnreachable(this.blueprintType);
               break;
            }
         }
      }
      this.lastBlueprintProgress = blueprintProgress;
   }
}

export default BlueprintComponent;