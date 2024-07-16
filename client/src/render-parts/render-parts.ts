import Entity from "../Entity";
import ColouredRenderPart from "./ColouredRenderPart";
import { BaseRenderObject } from "./RenderPart";
import TexturedRenderPart from "./TexturedRenderPart";

export type RenderPart = ColouredRenderPart | TexturedRenderPart;
export type RenderObject = Entity | BaseRenderObject;

export function renderPartIsTextured(renderPart: RenderPart): renderPart is TexturedRenderPart {
   return typeof (renderPart as TexturedRenderPart).textureArrayIndex !== "undefined";
}