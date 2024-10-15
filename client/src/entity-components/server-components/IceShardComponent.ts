import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "../ServerComponent";
import ServerComponentArray from "../ServerComponentArray";

class IceShardComponent extends ServerComponent {}

export default IceShardComponent;

export const IceShardComponentArray = new ServerComponentArray<IceShardComponent>(ServerComponentType.iceShard, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}

function updateFromData(): void {}