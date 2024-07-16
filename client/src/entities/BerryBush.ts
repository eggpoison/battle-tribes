import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { randFloat, randInt } from "webgl-test-shared/dist/utils";
import { LeafParticleSize, createLeafParticle, createLeafSpeckParticle } from "../particles";
import { AudioFilePath, playSound } from "../sound";
import Entity, { ComponentDataRecord } from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { BERRY_BUSH_TEXTURE_SOURCES } from "../entity-components/BerryBushComponent";

class BerryBush extends Entity {
   private static readonly RADIUS = 40;

   private static readonly LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
   private static readonly LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;

   constructor(id: number, componentDataRecord: ComponentDataRecord) {
      super(id, EntityType.berryBush);
      
      const berryBushComponentData = componentDataRecord[ServerComponentType.berryBush]!;
      
      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(BERRY_BUSH_TEXTURE_SOURCES[berryBushComponentData.numBerries]),
         0,
         0
      );
      renderPart.addTag("berryBushComponent:renderPart");
      this.attachRenderPart(renderPart);
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      const moveDirection = 2 * Math.PI * Math.random();
      
      const spawnPositionX = transformComponent.position.x + BerryBush.RADIUS * Math.sin(moveDirection);
      const spawnPositionY = transformComponent.position.y + BerryBush.RADIUS * Math.cos(moveDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), LeafParticleSize.small);
      
      // Create leaf specks
      for (let i = 0; i < 5; i++) {
         createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, BerryBush.RADIUS, BerryBush.LEAF_SPECK_COLOUR_LOW, BerryBush.LEAF_SPECK_COLOUR_HIGH);
      }

      playSound(("berry-bush-hit-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      for (let i = 0; i < 6; i++) {
         const offsetMagnitude = BerryBush.RADIUS * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(spawnOffsetDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), LeafParticleSize.small);
      }
      
      // Create leaf specks
      for (let i = 0; i < 9; i++) {
         createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, BerryBush.RADIUS * Math.random(), BerryBush.LEAF_SPECK_COLOUR_LOW, BerryBush.LEAF_SPECK_COLOUR_HIGH);
      }

      playSound("berry-bush-destroy-1.mp3", 0.4, 1, transformComponent.position);
   }
}

export default BerryBush;