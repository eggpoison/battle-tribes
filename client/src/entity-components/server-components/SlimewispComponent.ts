import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

class SlimewispComponent {}

export default SlimewispComponent;

export const SlimewispComponentArray = new ServerComponentArray<SlimewispComponent>(ServerComponentType.slimewisp, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}

function updateFromData(): void {}