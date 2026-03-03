import { PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../EntityRenderInfo";
import { EntityComponentData } from "../world";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

export default class ServerComponentArray<
   /** The actual component's type */
   T extends object = object,
   ComponentData extends object = object,
   ComponentIntermediateInfo extends object | never = object | never,
   ComponentType extends ServerComponentType = ServerComponentType
> extends ComponentArray<T, ComponentIntermediateInfo, ComponentArrayType.server, ComponentType> {
   public decodeData: (reader: PacketReader) => ComponentData;
   // Note: data is before entity as every function will need the reader, but not all are guaranteed to need the entity
   public updateFromData?(data: ComponentData, entity: Entity): void;
   /** Updates the player instance from server data */
   public updatePlayerFromData?(data: ComponentData, isInitialData: boolean): void;

   constructor(componentType: ComponentType, isActiveByDefault: boolean, createComponent: (entityComponentData: Readonly<EntityComponentData>, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderInfo: EntityRenderInfo) => T, getMaxRenderParts: (entityComponentData: EntityComponentData) => number, decodeData: (reader: PacketReader) => ComponentData) {
      super(ComponentArrayType.server, componentType, isActiveByDefault, createComponent, getMaxRenderParts);

      this.decodeData = decodeData;
   }
}