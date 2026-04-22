import { ComponentArray } from "./ComponentArray";

export default abstract class _ClientComponentArray<
   T extends object = object,
   ComponentIntermediateInfo = void
> extends ComponentArray<T, ComponentIntermediateInfo> {}