import { PacketReader, Entity } from "webgl-test-shared";
import { ComponentArray } from "./ComponentArray";

export default abstract class _ServerComponentArray<
   Component extends object,
   ComponentData extends object,
   ComponentIntermediateInfo = void
> extends ComponentArray<Component, ComponentData, ComponentIntermediateInfo> {
   public abstract decodeData(reader: PacketReader): ComponentData;
   // Note: data is before entity as every function will need the data, but not all are guaranteed to need the entity
   public updateFromData?(data: ComponentData, entity: Entity): void;
   public updatePlayerFromData?(data: ComponentData, isInitialData: boolean): void;
}