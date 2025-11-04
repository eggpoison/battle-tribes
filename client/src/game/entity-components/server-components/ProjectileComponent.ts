import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface ProjectileComponentData {}

export interface ProjectileComponent {}

export const ProjectileComponentArray = new ServerComponentArray<ProjectileComponent, ProjectileComponentData, never>(ServerComponentType.projectile, true, createComponent, getMaxRenderParts, decodeData);

function decodeData(): ProjectileComponentData {
   return {};
}

function createComponent(): ProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}