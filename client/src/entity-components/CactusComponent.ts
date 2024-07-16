import { CactusBodyFlowerData, CactusFlowerSize, CactusLimbData } from "webgl-test-shared/dist/entities";
import { CactusComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { createFlowerParticle } from "../particles";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

export const CACTUS_RADIUS = 40;

const getFlowerTextureSource = (type: number, size: CactusFlowerSize): string => {
   if (type === 4) {
      return "entities/cactus/cactus-flower-5.png";
   } else {
      return `entities/cactus/cactus-flower-${size === CactusFlowerSize.small ? "small" : "large"}-${type + 1}.png`;
   }
}

class CactusComponent extends ServerComponent<ServerComponentType.cactus> {
   private readonly flowerData: ReadonlyArray<CactusBodyFlowerData>;
   private readonly limbData: ReadonlyArray<CactusLimbData>;

   constructor(entity: Entity, data: CactusComponentData) {
      super(entity);

      this.flowerData = data.flowers;
      this.limbData = data.limbs;

      // Attach flower render parts
      for (let i = 0; i < data.flowers.length; i++) {
         const flowerInfo = data.flowers[i];

         const renderPart = new TexturedRenderPart(
            this.entity,
            3 + Math.random(),
            flowerInfo.rotation,
            getTextureArrayIndex(getFlowerTextureSource(flowerInfo.type, flowerInfo.size))
         );
         const offsetDirection = flowerInfo.column * Math.PI / 4;
         renderPart.offset.x = flowerInfo.height * Math.sin(offsetDirection);
         renderPart.offset.y = flowerInfo.height * Math.cos(offsetDirection);
         this.entity.attachRenderPart(renderPart);
      }

      // Limbs
      for (let i = 0; i < data.limbs.length; i++) {
         const limbInfo = data.limbs[i];

         const limbRenderPart = new TexturedRenderPart(
            this.entity,
            Math.random(),
            2 * Math.PI * Math.random(),
            getTextureArrayIndex("entities/cactus/cactus-limb.png")
         )
         limbRenderPart.offset.x = CACTUS_RADIUS * Math.sin(limbInfo.direction);
         limbRenderPart.offset.y = CACTUS_RADIUS * Math.cos(limbInfo.direction);
         this.entity.attachRenderPart(limbRenderPart);
         
         if (typeof limbInfo.flower !== "undefined") {
            const flowerInfo = limbInfo.flower;

            const flowerRenderPart = new TexturedRenderPart(
               limbRenderPart,
               1 + Math.random(),
               flowerInfo.rotation,
               getTextureArrayIndex(getFlowerTextureSource(flowerInfo.type, CactusFlowerSize.small))
            )
            flowerRenderPart.offset.x = flowerInfo.height * Math.sin(flowerInfo.direction);
            flowerRenderPart.offset.y = flowerInfo.height * Math.cos(flowerInfo.direction);
            this.entity.attachRenderPart(flowerRenderPart);
         }
      }
   }

   public updateFromData(_data: CactusComponentData): void {}

   onDie(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      
      for (const flower of this.flowerData) {
         const offsetDirection = flower.column * Math.PI / 4;
         const spawnPositionX = transformComponent.position.x + flower.height * Math.sin(offsetDirection);
         const spawnPositionY = transformComponent.position.y + flower.height * Math.cos(offsetDirection);

         createFlowerParticle(spawnPositionX, spawnPositionY, flower.type, flower.size, flower.rotation);
      }

      for (const limb of this.limbData) {
         if (typeof limb.flower !== "undefined") {
            const spawnPositionX = transformComponent.position.x + CACTUS_RADIUS * Math.sin(limb.direction) + limb.flower.height * Math.sin(limb.flower.direction);
            const spawnPositionY = transformComponent.position.y + CACTUS_RADIUS * Math.cos(limb.direction) + limb.flower.height * Math.cos(limb.flower.direction);

            createFlowerParticle(spawnPositionX, spawnPositionY, limb.flower.type, CactusFlowerSize.small, limb.flower.rotation);
         }
      }
   }
}

export default CactusComponent;