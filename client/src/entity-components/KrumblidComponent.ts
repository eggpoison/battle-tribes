import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

class KrumblidComponent extends ServerComponent {
   public padData(): void {}
   public updateFromData(): void {}
}

export default KrumblidComponent;

export const KrumblidComponentArray = new ComponentArray<KrumblidComponent>(ComponentArrayType.server, ServerComponentType.krumblid, true, {});