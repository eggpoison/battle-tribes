import { ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface ProjectileComponentData {}

export interface ProjectileComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.projectile, _ProjectileComponentArray> {}
}

class _ProjectileComponentArray extends _ServerComponentArray<ProjectileComponent, ProjectileComponentData> {
   public decodeData(): ProjectileComponentData {
      return {};
   }

   public createComponent(): ProjectileComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const ProjectileComponentArray = registerServerComponentArray(ServerComponentType.projectile, _ProjectileComponentArray, true);