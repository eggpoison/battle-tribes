import { PacketReader } from "../../../shared/src/packets";
import ServerComponent from "./ServerComponent";

export default class GuardianComponent extends ServerComponent {
   public padData(reader: PacketReader): void {}

   public updateFromData(reader: PacketReader): void {}
}