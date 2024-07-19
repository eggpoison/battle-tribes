import { EntityType } from "webgl-test-shared/dist/entities";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class Barrel extends Entity {
   public static readonly SIZE = 80;

   constructor(id: number) {
      super(id, EntityType.barrel);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex("entities/barrel/barrel.png")
         )
      );
   }

   public onLoad(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      if (transformComponent.ageTicks <= 0) {
         playSound("barrel-place.mp3", 0.4, 1, transformComponent.position);
      }
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playBuildingHitSound(transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("building-destroy-1.mp3", 0.4, 1, transformComponent.position);
   }
}

export default Barrel;