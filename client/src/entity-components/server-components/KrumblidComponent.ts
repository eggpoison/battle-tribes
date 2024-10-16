import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

class KrumblidComponent {}

export default KrumblidComponent;

export const KrumblidComponentArray = new ServerComponentArray<KrumblidComponent>(ServerComponentType.krumblid, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(): void {}

function updateFromData(): void {}