import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "../ServerComponent";
import ServerComponentArray from "../ServerComponentArray";

class KrumblidComponent extends ServerComponent {}

export default KrumblidComponent;

export const KrumblidComponentArray = new ServerComponentArray<KrumblidComponent>(ServerComponentType.krumblid, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}

function updateFromData(): void {}