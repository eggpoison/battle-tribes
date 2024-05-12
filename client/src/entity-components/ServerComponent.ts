import { ComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import Component from "./Component";

abstract class ServerComponent<T extends ServerComponentType = ServerComponentType> extends Component {
   public abstract updateFromData(data: ComponentData<T>): void;
}

export default ServerComponent;