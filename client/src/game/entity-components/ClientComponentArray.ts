import { assert } from "../../../../shared/src";
import { EntityRenderInfo } from "../EntityRenderInfo";
import { EntityComponentData } from "../world";
import { ClientComponentType } from "./client-component-types";
import { ComponentArray } from "./ComponentArray";

const clientComponentArrayRecord: Record<ClientComponentType, ClientComponentArray> = {} as unknown as Record<ClientComponentType, ClientComponentArray>;

export default class ClientComponentArray<
   T extends object = object,
   ComponentIntermediateInfo extends object | never = object | never
> extends ComponentArray<T, ComponentIntermediateInfo> {
   constructor(componentType: ClientComponentType, isActiveByDefault: boolean, createComponent: (entityComponentData: Readonly<EntityComponentData>, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderInfo: EntityRenderInfo) => T, getMaxRenderParts: (entityComponentData: EntityComponentData) => number) {
      super(isActiveByDefault, createComponent, getMaxRenderParts);
      
      assert(typeof clientComponentArrayRecord[componentType] === "undefined");
      // @Cleanup: casts
      clientComponentArrayRecord[componentType] = this as unknown as ClientComponentArray;
   }
}

export function getClientComponentArray(componentType: ClientComponentType): ClientComponentArray {
   return clientComponentArrayRecord[componentType];
}