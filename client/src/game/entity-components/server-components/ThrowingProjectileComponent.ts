import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface ThrowingProjectileComponentData {}

export interface ThrowingProjectileComponent {}

class _ThrowingProjectileComponentArray extends ServerComponentArray<ThrowingProjectileComponent, ThrowingProjectileComponentData> {
   public decodeData(): ThrowingProjectileComponentData {
      return {};
   }

   public createComponent(): ThrowingProjectileComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const ThrowingProjectileComponentArray = registerServerComponentArray(ServerComponentType.throwingProjectile, _ThrowingProjectileComponentArray, true);