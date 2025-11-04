import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface ThrowingProjectileComponentData {}

export interface ThrowingProjectileComponent {}

export const ThrowingProjectileComponentArray = new ServerComponentArray<ThrowingProjectileComponent, ThrowingProjectileComponentData, never>(ServerComponentType.throwingProjectile, true, createComponent, getMaxRenderParts, decodeData);

function decodeData(): ThrowingProjectileComponentData {
   return {};
}

function createComponent(): ThrowingProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}