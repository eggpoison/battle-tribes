import { Colour } from "webgl-test-shared/dist/utils";

const kRGBToYPrime = [0.299, 0.587, 0.114];
const kRGBToI = [0.596, -0.275, -0.321];
const kRGBToQ = [0.212, -0.523, 0.311];

const kYIQToR = [1.0, 0.956, 0.621];
const kYIQToG = [1.0, -0.272, -0.647];
const kYIQToB = [1.0, -1.107, 1.704];

export function hueShift(colour: Colour, hueAdjust: number): void {
   // Convert to YIQ
   const YPrime = colour.r * kRGBToYPrime[0] + colour.g * kRGBToYPrime[1] + colour.b * kRGBToYPrime[2];
   let I = colour.r * kRGBToI[0] + colour.g * kRGBToI[1] + colour.b * kRGBToI[2];
   let Q = colour.r * kRGBToQ[0] + colour.g * kRGBToQ[1] + colour.b * kRGBToQ[2];

   // Calculate the hue and chroma
   let hue = Math.atan2(Q, I);
   const chroma = Math.sqrt(I * I + Q * Q);

   // Make the user's adjustments
   hue += hueAdjust;

   // Convert back to YIQ
   Q = chroma * Math.sin(hue);
   I = chroma * Math.cos(hue);

   // Convert back to RGB
   colour.r = YPrime * kYIQToR[0] + I * kYIQToR[1] + Q * kYIQToR[2];
   colour.g = YPrime * kYIQToG[0] + I * kYIQToG[1] + Q * kYIQToG[2];
   colour.b = YPrime * kYIQToB[0] + I * kYIQToB[1] + Q * kYIQToB[2];
}