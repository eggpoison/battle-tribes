import { ServerComponentType, SlimeSpitComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";

class SlimeSpitComponent extends ServerComponent<ServerComponentType.slimeSpit> {
   public updateFromData(_data: SlimeSpitComponentData): void {}
}

export default SlimeSpitComponent;