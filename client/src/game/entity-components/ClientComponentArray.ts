import { assert } from "../../../../shared/src";
import { EntityRenderInfo } from "../EntityRenderInfo";
import { EntityComponentData } from "../world";
import { ClientComponentType } from "./client-component-types";
import { ComponentArray } from "./ComponentArray";

const clientComponentArrayRecord: Record<ClientComponentType, ClientComponentArray> = {} as unknown as Record<ClientComponentType, ClientComponentArray>;

export default class ClientComponentArray<
   T extends object = object,
   ComponentIntermediateInfo extends object | never = object | never,
   ComponentType extends ClientComponentType = ClientComponentType
> extends ComponentArray<T, ComponentIntermediateInfo> {
   constructor(componentType: ComponentType, isActiveByDefault: boolean, createComponent: (entityComponentData: Readonly<EntityComponentData>, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderInfo: EntityRenderInfo) => T, getMaxRenderParts: (entityComponentData: EntityComponentData) => number) {
      super(isActiveByDefault, createComponent, getMaxRenderParts);
      
      assert(typeof clientComponentArrayRecord[componentType as ClientComponentType] === "undefined");
      // @Cleanup: casts
      clientComponentArrayRecord[componentType as ClientComponentType] = this as unknown as ClientComponentArray;
   }
}

export function getClientComponentArray(componentType: ClientComponentType): ClientComponentArray {
   return clientComponentArrayRecord[componentType];
}