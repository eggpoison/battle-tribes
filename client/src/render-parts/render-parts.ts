import Entity from "../Entity";
import ColouredRenderPart from "./ColouredRenderPart";
import RenderAttachPoint from "./RenderAttachPoint";
import { BaseRenderThing } from "./RenderPart";
import TexturedRenderPart from "./TexturedRenderPart";

export type RenderPart = ColouredRenderPart | TexturedRenderPart;
export type RenderObject = Entity | BaseRenderThing;

export function renderPartIsTextured(renderPart: RenderPart): renderPart is TexturedRenderPart {
   return typeof (renderPart as TexturedRenderPart).textureArrayIndex !== "undefined";
}

export const enum RenderUnitType {
   renderPart,
   attachPoint
}

export type RenderThing = RenderPart | RenderAttachPoint;

export function thingIsRenderPart(thing: RenderThing): thing is RenderPart {
   return typeof (thing as RenderPart).modelMatrixData !== "undefined";
}