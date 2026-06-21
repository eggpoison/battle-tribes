import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { ComponentArray } from "./ComponentArray";

export default abstract class ServerComponentArray<
   Component extends object,
   ComponentData extends object,
   ComponentIntermediateInfo = void
> extends ComponentArray<Component, ComponentData, ComponentIntermediateInfo> {
   public abstract decodeData(reader: PacketReader): ComponentData;
   // Note: data is before entity as every function will need the data, but not all are guaranteed to need the entity
   public updateFromData?(data: ComponentData, entity: Entity): void;
   public updatePlayerFromData?(data: ComponentData, isInitialData: boolean): void;
}