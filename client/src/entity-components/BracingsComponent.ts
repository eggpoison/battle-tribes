import { ServerComponentType } from "../../../shared/src/components";
import { PacketReader } from "../../../shared/src/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";

export class BracingsComponent extends ServerComponent {
   public padData(reader: PacketReader): void {}

   public updateFromData(reader: PacketReader): void {}
}

export const BracingsComponentArray = new ComponentArray<BracingsComponent>(ComponentArrayType.server, ServerComponentType.bracings, true, {});