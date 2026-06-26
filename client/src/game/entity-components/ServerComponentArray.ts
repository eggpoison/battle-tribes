import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { EntityRenderObject } from "../EntityRenderObject";
import { EntityComponentData } from "../world";
import { ComponentArray } from "./ComponentArray";

export default class ServerComponentArray<
   Component extends object,
   ComponentData extends object,
   ComponentIntermediateInfo = any
> extends ComponentArray<Component, ComponentData, ComponentIntermediateInfo> {
   public readonly decodeData: (reader: PacketReader) => ComponentData;
   // Note: data is before entity as every function will need the data, but not all are guaranteed to need the entity
   public updateFromData?(data: ComponentData, entity: Entity): void;
   public updatePlayerFromData?(data: ComponentData, isInitialData: boolean): void;

   constructor(isActiveByDefault: boolean, createComponent: (entityComponentData: EntityComponentData, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderObject: EntityRenderObject) => Component, getMaxRenderParts: (entityComponentData: EntityComponentData) => number, decodeData: (reader: PacketReader) => ComponentData) {
      super(isActiveByDefault, createComponent, getMaxRenderParts);
      this.decodeData = decodeData;
   }
}