import { ComponentArray } from "./ComponentArray";

export default class ClientComponentArray<
   Component extends object,
   ComponentData extends object,
   ComponentIntermediateInfo = any
> extends ComponentArray<Component, ComponentData, ComponentIntermediateInfo> {}