import { ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface ThrowingProjectileComponentData {}

export interface ThrowingProjectileComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.throwingProjectile, _ThrowingProjectileComponentArray, ThrowingProjectileComponentData> {}
}

class _ThrowingProjectileComponentArray extends _ServerComponentArray<ThrowingProjectileComponent, ThrowingProjectileComponentData> {
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