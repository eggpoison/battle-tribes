import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface ThrowingProjectileComponentData {}

export interface ThrowingProjectileComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.throwingProjectile, typeof ThrowingProjectileComponentArray> {}
}

export const ThrowingProjectileComponentArray = registerServerComponentArray(
   ServerComponentType.throwingProjectile,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(): ThrowingProjectileComponentData {
   return {};
}

function createComponent(): ThrowingProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}