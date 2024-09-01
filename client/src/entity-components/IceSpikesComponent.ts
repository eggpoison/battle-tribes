import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

class IceSpikesComponent extends ServerComponent {
   public padData(): void {}
   public updateFromData(): void {}
}

export default IceSpikesComponent;

export const IceSpikesComponentArray = new ComponentArray<IceSpikesComponent>(ComponentArrayType.server, ServerComponentType.iceSpikes, true, {});