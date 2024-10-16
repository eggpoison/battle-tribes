import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

class PebblumComponent {}

export default PebblumComponent;

export const PebblumComponentArray = new ServerComponentArray<PebblumComponent>(ServerComponentType.pebblum, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}

function updateFromData(): void {}