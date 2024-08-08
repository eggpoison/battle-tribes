import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

class PebblumComponent extends ServerComponent {
   public padData(): void {}
   public updateFromData(): void {}
}

export default PebblumComponent;

export const PebblumComponentArray = new ComponentArray<PebblumComponent>(ComponentArrayType.server, ServerComponentType.pebblum, {});