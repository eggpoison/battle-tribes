import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playBuildingHitSound, playSound } from "../sound";
import Entity from "../Entity";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class TribeTotem extends Entity {
   public static readonly SIZE = 120;

   constructor(id: number) {
      super(id, EntityType.tribeTotem);

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/tribe-totem/tribe-totem.png`),
         1,
         0
      );
      this.attachRenderPart(renderPart);
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

export default TribeTotem;