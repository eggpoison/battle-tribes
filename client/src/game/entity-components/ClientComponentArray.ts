import { ComponentArray } from "./ComponentArray";

export default abstract class _ClientComponentArray<
   Component extends object,
   ComponentData extends object,
   ComponentIntermediateInfo = void
> extends ComponentArray<Component, ComponentData, ComponentIntermediateInfo> {}