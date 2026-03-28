import { Colour, lerp } from "../../../../shared/src";
import BaseRenderPart from "./BaseRenderPart";

// Underscore at the start to differentiate from the specific type in render-parts
export default abstract class _VisualRenderPart extends BaseRenderPart {
   public opacity = 1;

   public tintR = 0;
   public tintG = 0;
   public tintB = 0;
}

const kRGBToYPrime = [0.299, 0.587, 0.114];
const kRGBToI = [0.596, -0.275, -0.321];
const kRGBToQ = [0.212, -0.523, 0.311];

const kYIQToR = [1.0, 0.956, 0.621];
const kYIQToG = [1.0, -0.272, -0.647];
const kYIQToB = [1.0, -1.107, 1.704];

export function hueShift(renderPart: _VisualRenderPart, hueAdjust: number): void {
   // Convert to YIQ
   const YPrime = renderPart.tintR * kRGBToYPrime[0] + renderPart.tintG * kRGBToYPrime[1] + renderPart.tintB * kRGBToYPrime[2];
   let I = renderPart.tintR * kRGBToI[0] + renderPart.tintG * kRGBToI[1] + renderPart.tintB * kRGBToI[2];
   let Q = renderPart.tintR * kRGBToQ[0] + renderPart.tintG * kRGBToQ[1] + renderPart.tintB * kRGBToQ[2];

   // Calculate the hue and chroma
   let hue = Math.atan2(Q, I);
   const chroma = Math.sqrt(I * I + Q * Q);

   // Make the user's adjustments
   hue += hueAdjust;

   // Convert back to YIQ
   Q = chroma * Math.sin(hue);
   I = chroma * Math.cos(hue);

   // Convert back to RGB
   renderPart.tintR = YPrime * kYIQToR[0] + I * kYIQToR[1] + Q * kYIQToR[2];
   renderPart.tintG = YPrime * kYIQToG[0] + I * kYIQToG[1] + Q * kYIQToG[2];
   renderPart.tintB = YPrime * kYIQToB[0] + I * kYIQToB[1] + Q * kYIQToB[2];
}

export function multiColourLerp(renderPart: _VisualRenderPart, colours: ReadonlyArray<Colour>, u: number): void {
   const progress = u * (colours.length - 1);
   
   const lowColour = colours[Math.floor(progress)];
   const highColour = colours[Math.ceil(progress)];

   const interLerp = progress % 1;

   renderPart.tintR = lerp(lowColour.r, highColour.r, interLerp),
   renderPart.tintG = lerp(lowColour.g, highColour.g, interLerp),
   renderPart.tintB = lerp(lowColour.b, highColour.b, interLerp),
   renderPart.opacity = lerp(lowColour.a, highColour.a, interLerp);
}