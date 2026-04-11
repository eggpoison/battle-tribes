import { Hitbox } from "../hitboxes";
import ColouredRenderPart from "./ColouredRenderPart";
import RenderAttachPoint from "./RenderAttachPoint";
import TexturedRenderPart from "./TexturedRenderPart";

export type VisualRenderPart = ColouredRenderPart | TexturedRenderPart;
export type RenderPart = VisualRenderPart | RenderAttachPoint;


// @HACK: changing this from Hitbox to HitboxReference.
export type RenderPartParent = Hitbox | RenderPart;

export function renderPartIsTextured(renderPart: VisualRenderPart): renderPart is TexturedRenderPart {
   return (renderPart as TexturedRenderPart).textureArrayIndex !== undefined;
}

export function thingIsVisualRenderPart(thing: Readonly<RenderPart>): thing is VisualRenderPart {
   return (thing as VisualRenderPart).tintR !== undefined;
}

export function renderParentIsHitbox(parent: RenderPartParent): parent is Hitbox {
   return parent !== null && (parent as Hitbox).mass !== undefined;
}