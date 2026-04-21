import { ServerComponentType } from "../../../../shared/src";
import { ClientComponentType } from "./client-component-types";
import ClientComponentArray from "./ClientComponentArray";
import { ComponentArray } from "./ComponentArray";
import ServerComponentArray from "./ServerComponentArray";

const clientComponentRegistry = new Map<ClientComponentType, ClientComponentArray<object, unknown>>();
const serverComponentRegistry = new Map<ServerComponentType, ServerComponentArray<object, object, unknown>>();

export const COMPONENT_ARRAYS: Array<ComponentArray<object, unknown>> = [];

export function registerClientComponentArray<C extends new (...args: [isActiveByDefault: boolean]) => ClientComponentArray<object, unknown>>(componentType: ClientComponentType, prototype: C, ...args: ConstructorParameters<C>): InstanceType<C> {
   let componentArray = clientComponentRegistry.get(componentType);
   if (componentArray === undefined) {
      // @HACK the single arg!!
      componentArray = new prototype(args[0]);
      clientComponentRegistry.set(componentType, componentArray);

      COMPONENT_ARRAYS.push(componentArray);
   }

   return componentArray as InstanceType<C>;
}

export function registerServerComponentArray<C extends new (...args: [isActiveByDefault: boolean]) => ServerComponentArray<object, object, unknown>>(componentType: ServerComponentType, prototype: C, ...args: ConstructorParameters<C>): InstanceType<C> {
   let componentArray = serverComponentRegistry.get(componentType);
   if (componentArray === undefined) {
      // @HACK the single arg!!
      componentArray = new prototype(args[0]);
      serverComponentRegistry.set(componentType, componentArray);

      COMPONENT_ARRAYS.push(componentArray);
   }

   return componentArray as InstanceType<C>;
}

export function getClientComponentArray(componentType: ClientComponentType): ClientComponentArray<object, unknown> {
   return clientComponentRegistry.get(componentType)!;
}

export function getServerComponentArray(componentType: ServerComponentType): ServerComponentArray<object, object, unknown> {
   return serverComponentRegistry.get(componentType)!;
}