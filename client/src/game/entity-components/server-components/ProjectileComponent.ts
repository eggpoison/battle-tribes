import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface ProjectileComponentData {}

export interface ProjectileComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.projectile, typeof ProjectileComponentArray> {}
}

export const ProjectileComponentArray = registerServerComponentArray(
   ServerComponentType.projectile,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(): ProjectileComponentData {
   return {};
}

function createComponent(): ProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}