import { createSlimePoolParticle, createSlimeSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import { TileType } from "battletribes-shared/tiles";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityTile, TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { getEntityLayer, getEntityRenderInfo } from "../world";

class Slimewisp extends Entity {
   private static readonly RADIUS = 16;

   constructor(id: number) {
      super(id);

      const renderPart = new TexturedRenderPart(
         null,
         0,
         0,
         getTextureArrayIndex(`entities/slimewisp/slimewisp.png`)
      );
      renderPart.opacity = 0.8;

      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(renderPart);
   }

   public overrideTileMoveSpeedMultiplier(): number | null {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const layer = getEntityLayer(this.id);
      
      // Slimewisps move at normal speed on slime blocks
      const tile = getEntityTile(layer, transformComponent);
      if (tile.type === TileType.slime) {
         return 1;
      }
      return null;
   }

   protected onHit(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, Slimewisp.RADIUS);

      for (let i = 0; i < 2; i++) {
         createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, Slimewisp.RADIUS * Math.random());
      }
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, Slimewisp.RADIUS);

      for (let i = 0; i < 3; i++) {
         createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, Slimewisp.RADIUS * Math.random());
      }
   }
}

export default Slimewisp;