import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface ProjectileComponentData {}

export interface ProjectileComponent {}

class _ProjectileComponentArray extends ServerComponentArray<ProjectileComponent, ProjectileComponentData> {
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