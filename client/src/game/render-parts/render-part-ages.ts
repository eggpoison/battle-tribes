import { currentSnapshot } from "../game";
import { RenderPart } from "./render-parts";

const creationTicksMap = new WeakMap<RenderPart, number>();
   
export function setRenderPartAge(renderPart: RenderPart): void {
   creationTicksMap.set(renderPart, currentSnapshot.tick);
}

export function getRenderPartAge(renderPart: RenderPart): number {
   const creationTicks = creationTicksMap.get(renderPart);
   if (creationTicks === undefined) {
      throw new Error("Render part didn't have age set initially!!");
   }
   return currentSnapshot.tick - creationTicks;
}