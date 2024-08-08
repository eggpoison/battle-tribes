import { Settings } from "webgl-test-shared/dist/settings";
import { randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import Board from "../Board";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { playSound } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class IceArrow extends Entity {
   constructor(id: number) {
      super(id, EntityType.iceArrow);

      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex("projectiles/ice-arrow.png")
         )
      );
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound("arrow-hit.mp3", 0.4, 1, transformComponent.position);
   }
}

export default IceArrow;