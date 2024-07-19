import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import BaseRenderPart, { BaseRenderObject } from "./RenderPart";

class TexturedRenderPart extends BaseRenderPart {
   public textureArrayIndex: number;

   public flipX = false;

   constructor(parent: BaseRenderObject, zIndex: number, rotation: number, textureArrayIndex: number) {
      super(parent, zIndex, rotation);
      
      this.textureArrayIndex = textureArrayIndex;
   }

   public switchTextureSource(textureSource: string): void {
      this.textureArrayIndex = getTextureArrayIndex(textureSource);
   }
}

export default TexturedRenderPart;