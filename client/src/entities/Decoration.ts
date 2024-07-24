import { DecorationType, ServerComponentType } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { EntityType } from "webgl-test-shared/dist/entities";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";

const DECORATION_RENDER_INFO: Record<DecorationType, string> = {
   [DecorationType.pebble]: "decorations/pebble.png",
   [DecorationType.rock]: "decorations/rock1.png",
   [DecorationType.sandstoneRock]: "decorations/sandstone-rock.png",
   [DecorationType.sandstoneRockBig1]: "decorations/sandstone-rock-big1.png",
   [DecorationType.sandstoneRockBig2]: "decorations/sandstone-rock-big2.png",
   [DecorationType.blackRockSmall]: "decorations/black-rock-small.png",
   [DecorationType.blackRock]: "decorations/black-rock.png",
   [DecorationType.snowPile]: "decorations/snow-pile.png",
   [DecorationType.flower1]: "decorations/flower1.png",
   [DecorationType.flower2]: "decorations/flower2.png",
   [DecorationType.flower3]: "decorations/flower3.png",
   [DecorationType.flower4]: "decorations/flower4.png"
};

class Decoration extends Entity {
   constructor(id: number) {
      super(id, EntityType.decoration);
   }

   public onLoad(): void {
      const decorationComponent = this.getServerComponent(ServerComponentType.decoration);
      
      this.attachRenderPart(
         new TexturedRenderPart(
            this,
            0,
            0,
            getTextureArrayIndex(DECORATION_RENDER_INFO[decorationComponent.decorationType])
         )
      );
   }
}

export default Decoration;