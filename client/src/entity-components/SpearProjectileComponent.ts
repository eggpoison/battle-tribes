import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

class SpearProjectileComponent extends ServerComponent {
   public padData(): void {}
   public updateFromData(): void {}
}

export default SpearProjectileComponent;

export const SpearProjectileComponentArray = new ComponentArray<SpearProjectileComponent>(ComponentArrayType.server, ServerComponentType.spearProjectile, true, {});