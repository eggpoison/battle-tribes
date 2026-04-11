import { RenderPart } from "./render-parts";

const shakeAmounts = new WeakMap<RenderPart, number>();

export function setRenderPartShakeAmount(renderPart: RenderPart, shakeAmount: number): void {
   shakeAmounts.set(renderPart, shakeAmount);
}

export function getRenderPartShakeAmount(renderPart: RenderPart): number {
   const shakeAmount = shakeAmounts.get(renderPart);
   return shakeAmount || 0;
}