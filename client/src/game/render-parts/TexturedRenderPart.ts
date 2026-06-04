import { TextureIndex } from "../../texture-index";
import { RenderPartParent } from "./render-parts";
import VisualRenderPart from "./VisualRenderPart";

class TexturedRenderPart extends VisualRenderPart {
   public textureIndex: number;

   constructor(parent: RenderPartParent, zIndex: number, rotation: number, offsetX: number, offsetY: number, textureIndex: number) {
      super(parent, zIndex, rotation, offsetX, offsetY);
      this.textureIndex = textureIndex;
   }

   public switchTextureSource(textureIndex: TextureIndex): void {
      // @Incomplete: should dirty the render part here??
      this.textureIndex = textureIndex;
   }
}

export default TexturedRenderPart;