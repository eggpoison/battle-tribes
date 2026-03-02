import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { RenderPartParent } from "./render-parts";
import VisualRenderPart from "./VisualRenderPart";

class TexturedRenderPart extends VisualRenderPart {
   public textureArrayIndex: number;

   constructor(parent: RenderPartParent, zIndex: number, rotation: number, textureArrayIndex: number) {
      super(parent, zIndex, rotation);
      
      this.textureArrayIndex = textureArrayIndex;
   }

   public switchTextureSource(textureSource: string): void {
      this.textureArrayIndex = getTextureArrayIndex(textureSource);
      // @Incomplete: should dirty the render part here??
   }
}

export default TexturedRenderPart;