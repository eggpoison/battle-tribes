import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import RenderPart from "../render-parts/RenderPart";
import { LeafParticleSize, createLeafParticle, createLeafSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { AudioFilePath, playSound } from "../sound";
import BerryBushComponent from "../entity-components/BerryBushComponent";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import Entity from "../Entity";

class BerryBush extends Entity {
   private static readonly RADIUS = 40;

   private static readonly LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
   private static readonly LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;

   public static readonly TEXTURE_SOURCES = [
      "entities/berry-bush1.png",
      "entities/berry-bush2.png",
      "entities/berry-bush3.png",
      "entities/berry-bush4.png",
      "entities/berry-bush5.png",
      "entities/berry-bush6.png"
   ];

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.berryBush>) {
      super(position, id, EntityType.berryBush, ageTicks);

      const berryBushComponentData = componentsData[2];
      
      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(BerryBush.TEXTURE_SOURCES[berryBushComponentData.numBerries]),
         0,
         0
      );
      this.attachRenderPart(renderPart);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.berryBush, new BerryBushComponent(this, berryBushComponentData, renderPart));
   }

   protected onHit(): void {
      const moveDirection = 2 * Math.PI * Math.random();
      
      const spawnPositionX = this.position.x + BerryBush.RADIUS * Math.sin(moveDirection);
      const spawnPositionY = this.position.y + BerryBush.RADIUS * Math.cos(moveDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), LeafParticleSize.small);
      
      // Create leaf specks
      for (let i = 0; i < 5; i++) {
         createLeafSpeckParticle(this.position.x, this.position.y, BerryBush.RADIUS, BerryBush.LEAF_SPECK_COLOUR_LOW, BerryBush.LEAF_SPECK_COLOUR_HIGH);
      }

      playSound(("berry-bush-hit-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      for (let i = 0; i < 6; i++) {
         const offsetMagnitude = BerryBush.RADIUS * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + offsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + offsetMagnitude * Math.cos(spawnOffsetDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), LeafParticleSize.small);
      }
      
      // Create leaf specks
      for (let i = 0; i < 9; i++) {
         createLeafSpeckParticle(this.position.x, this.position.y, BerryBush.RADIUS * Math.random(), BerryBush.LEAF_SPECK_COLOUR_LOW, BerryBush.LEAF_SPECK_COLOUR_HIGH);
      }

      playSound("berry-bush-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default BerryBush;