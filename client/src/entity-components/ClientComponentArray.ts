import { ComponentArray, ComponentArrayFunctions, ComponentArrayType } from "./ComponentArray";
import { ClientComponentType } from "./components";

export default class ClientComponentArray<T extends object = object, ComponentType extends ClientComponentType = ClientComponentType> extends ComponentArray<T, ComponentArrayType.client, ComponentType> {
   constructor(componentType: ComponentType, isActiveByDefault: boolean, functions: ComponentArrayFunctions<T>) {
      super(ComponentArrayType.client, componentType, isActiveByDefault, functions);
   }
}