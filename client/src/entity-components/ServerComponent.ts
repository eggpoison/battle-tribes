import Component from "./Component";
import { PacketReader } from "webgl-test-shared/dist/packets";

abstract class ServerComponent extends Component {
   public abstract padData(reader: PacketReader): void;
   
   public abstract updateFromData(reader: PacketReader): void;

   public updatePlayerFromData?(reader: PacketReader): void;
}

export default ServerComponent;