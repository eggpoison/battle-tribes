import { ServerComponentType, SlimeSpitComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
declare class SlimeSpitComponent extends ServerComponent<ServerComponentType.slimeSpit> {
    updateFromData(_data: SlimeSpitComponentData): void;
}
export default SlimeSpitComponent;
