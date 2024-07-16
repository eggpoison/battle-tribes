import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { TileType } from "webgl-test-shared/dist/tiles";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class Slimewisp extends Entity {
   private static readonly RADIUS = 16;

   constructor(id: number) {
      super(id, EntityType.slimewisp);

      const renderPart = new RenderPart(
         this,
         getTextureArrayIndex(`entities/slimewisp/slimewisp.png`),
         0,
         0
      );
      renderPart.opacity = 0.8;
      this.attachRenderPart(renderPart);
   }

   public overrideTileMoveSpeedMultiplier(): number | null {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      // Slimewisps move at normal speed on slime blocks
      if (transformComponent.tile.type === TileType.slime) {
         return 1;
      }
      return null;
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, Slimewisp.RADIUS);

      for (let i = 0; i < 2; i++) {
         createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, Slimewisp.RADIUS * Math.random());
      }
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, Slimewisp.RADIUS);

      for (let i = 0; i < 3; i++) {
         createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, Slimewisp.RADIUS * Math.random());
      }
   }
}

export default Slimewisp;