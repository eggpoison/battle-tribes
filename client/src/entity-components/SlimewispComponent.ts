import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

class SlimewispComponent extends ServerComponent {
   public padData(): void {}
   
   public updateFromData(): void {}
}

export default SlimewispComponent;

export const SlimewispComponentArray = new ComponentArray<SlimewispComponent>(ComponentArrayType.server, ServerComponentType.slimewisp, {});