import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

class ThrowingProjectileComponent extends ServerComponent {
   public padData(): void {}
   public updateFromData(): void {}
}

export default ThrowingProjectileComponent;

export const ThrowingProjectileComponentArray = new ComponentArray<ThrowingProjectileComponent>(ComponentArrayType.server, ServerComponentType.throwingProjectile, {});