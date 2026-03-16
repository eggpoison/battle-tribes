import BaseRenderPart from "./BaseRenderPart";

// Underscore at the start to differentiate from the specific type in render-parts
export default abstract class _VisualRenderPart extends BaseRenderPart {
   public opacity = 1;

   public tintR = 0;
   public tintG = 0;
   public tintB = 0;
}