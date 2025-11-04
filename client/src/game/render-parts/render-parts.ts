import { Hitbox } from "../hitboxes";
import ColouredRenderPart from "./ColouredRenderPart";
import RenderAttachPoint from "./RenderAttachPoint";
import TexturedRenderPart from "./TexturedRenderPart";

export type VisualRenderPart = ColouredRenderPart | TexturedRenderPart;
export type RenderPart = VisualRenderPart | RenderAttachPoint;


// @HACK: changing this from Hitbox to HitboxReference.
export type RenderPartParent = Hitbox | RenderPart;

export function renderPartIsTextured(renderPart: VisualRenderPart): renderPart is TexturedRenderPart {
   return typeof (renderPart as TexturedRenderPart).textureArrayIndex !== "undefined";
}

export function thingIsVisualRenderPart(thing: Readonly<RenderPart>): thing is VisualRenderPart {
   return typeof (thing as VisualRenderPart).tintR !== "undefined";
}

export function renderParentIsHitbox(parent: RenderPartParent): parent is Hitbox {
   return parent !== null && typeof (parent as Hitbox).mass !== "undefined";
}