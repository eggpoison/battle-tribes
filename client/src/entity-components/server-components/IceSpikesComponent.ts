import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import ServerComponent from "../ServerComponent";

class IceSpikesComponent extends ServerComponent {}

export default IceSpikesComponent;

export const IceSpikesComponentArray = new ServerComponentArray<IceSpikesComponent>(ServerComponentType.iceSpikes, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}

function updateFromData(): void {}