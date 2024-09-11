import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

class IceShardComponent extends ServerComponent {
   public padData(): void {}
   public updateFromData(): void {}
}

export default IceShardComponent;

export const IceShardComponentArray = new ComponentArray<IceShardComponent>(ComponentArrayType.server, ServerComponentType.iceShard, true, {});