import { PacketReader, Entity } from "webgl-test-shared";
import { ComponentArray } from "./ComponentArray";

export default abstract class ServerComponentArray<
   Component extends object = never,
   ComponentData extends object = object,
   ComponentIntermediateInfo = void
> extends ComponentArray<Component, ComponentIntermediateInfo> {
   public abstract decodeData(reader: PacketReader): ComponentData;
   // Note: data is before entity as every function will need the data, but not all are guaranteed to need the entity
   public updateFromData?(data: ComponentData, entity: Entity): void;
   /** Updates the player instance from server data */
   public updatePlayerFromData?(data: ComponentData, isInitialData: boolean): void;
}