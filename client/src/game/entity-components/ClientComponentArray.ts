import { EntityRenderInfo } from "../EntityRenderInfo";
import { EntityComponentData } from "../world";
import { ClientComponentType } from "./client-component-types";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

export default class ClientComponentArray<
   T extends object = object,
   ComponentIntermediateInfo extends object | never = object | never,
   ComponentType extends ClientComponentType = ClientComponentType
> extends ComponentArray<T, ComponentIntermediateInfo, ComponentArrayType.client, ComponentType> {
   constructor(componentType: ComponentType, isActiveByDefault: boolean, createComponent: (entityComponentData: Readonly<EntityComponentData>, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderInfo: EntityRenderInfo) => T, getMaxRenderParts: (entityComponentData: EntityComponentData) => number) {
      super(ComponentArrayType.client, componentType, isActiveByDefault, createComponent, getMaxRenderParts);
   }
}