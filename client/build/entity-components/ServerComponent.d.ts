import { ComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import Component from "./Component";
declare abstract class ServerComponent<T extends ServerComponentType = ServerComponentType> extends Component {
    abstract updateFromData(data: ComponentData<T>): void;
}
export default ServerComponent;
