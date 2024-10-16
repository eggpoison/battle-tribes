import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

class ThrowingProjectileComponent {}

export default ThrowingProjectileComponent;

export const ThrowingProjectileComponentArray = new ServerComponentArray<ThrowingProjectileComponent>(ServerComponentType.throwingProjectile, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}

function updateFromData(): void {}