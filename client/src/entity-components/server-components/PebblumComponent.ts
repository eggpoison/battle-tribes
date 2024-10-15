import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "../ServerComponent";
import ServerComponentArray from "../ServerComponentArray";

class PebblumComponent extends ServerComponent {}

export default PebblumComponent;

export const PebblumComponentArray = new ServerComponentArray<PebblumComponent>(ServerComponentType.pebblum, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}

function updateFromData(): void {}