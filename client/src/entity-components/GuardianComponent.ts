import { PacketReader } from "../../../shared/src/packets";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";

export default class GuardianComponent extends ServerComponent {
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);
   }

   public padData(reader: PacketReader): void {}

   public updateFromData(reader: PacketReader): void {}
}