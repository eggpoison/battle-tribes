import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "../ServerComponent";
import ServerComponentArray from "../ServerComponentArray";

class ThrowingProjectileComponent extends ServerComponent {}

export default ThrowingProjectileComponent;

export const ThrowingProjectileComponentArray = new ServerComponentArray<ThrowingProjectileComponent>(ServerComponentType.throwingProjectile, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}

function updateFromData(): void {}