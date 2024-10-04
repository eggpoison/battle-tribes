import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { RenderParent } from "./render-parts";
import BaseRenderPart from "./RenderPart";

class TexturedRenderPart extends BaseRenderPart {
   public textureArrayIndex: number;

   constructor(parent: RenderParent, zIndex: number, rotation: number, textureArrayIndex: number) {
      super(parent, zIndex, rotation);
      
      this.textureArrayIndex = textureArrayIndex;
   }

   public switchTextureSource(textureSource: string): void {
      this.textureArrayIndex = getTextureArrayIndex(textureSource);
   }
}

export default TexturedRenderPart;