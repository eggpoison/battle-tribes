import { PacketReader, Entity, ServerComponentType, assert } from "webgl-test-shared";
import { EntityRenderObject } from "../EntityRenderObject";
import { EntityComponentData } from "../world";
import { ComponentArray } from "./ComponentArray";

const serverComponentArrayRecord: Record<ServerComponentType, ServerComponentArray> = {} as unknown as Record<ServerComponentType, ServerComponentArray>;

export default class ServerComponentArray<
   /** The actual component's type */
   T extends object = object,
   ComponentData extends object = object,
   ComponentIntermediateInfo extends object | never = object | never,
   ComponentType extends ServerComponentType = ServerComponentType
> extends ComponentArray<T, ComponentIntermediateInfo> {
   // @HACK here for hack
   public readonly componentType: ComponentType;
   
   public decodeData: (reader: PacketReader) => ComponentData;
   // Note: data is before entity as every function will need the reader, but not all are guaranteed to need the entity
   public updateFromData?(data: ComponentData, entity: Entity): void;
   /** Updates the player instance from server data */
   public updatePlayerFromData?(data: ComponentData, isInitialData: boolean): void;

   constructor(componentType: ComponentType, isActiveByDefault: boolean, createComponent: (entityComponentData: Readonly<EntityComponentData>, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderObject: EntityRenderObject) => T, getMaxRenderParts: (entityComponentData: EntityComponentData) => number, decodeData: (reader: PacketReader) => ComponentData) {
      super(isActiveByDefault, createComponent, getMaxRenderParts);

      this.componentType = componentType;
      this.decodeData = decodeData;

      assert(serverComponentArrayRecord[componentType as ServerComponentType] === undefined);
      // @Cleanup: casts
      serverComponentArrayRecord[componentType as ServerComponentType] = this as unknown as ServerComponentArray;
   }
}

export function getServerComponentArray(componentType: ServerComponentType): ServerComponentArray {
   // @Speed: can be array
   return serverComponentArrayRecord[componentType];
}