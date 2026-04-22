import { ServerComponentType } from "../../../../shared/src";
import { ClientComponentType } from "./client-component-types";
import _ClientComponentArray from "./ClientComponentArray";
import _ServerComponentArray from "./ServerComponentArray";

export interface ClientComponentRegistry {
   // To be extended
}
export interface ServerComponentRegistry {
   // To be extended
}

export type RegisterClientComponent<Type extends ClientComponentType, Array extends _ClientComponentArray<object, unknown>, Data extends object> = {
   [K in Type]: {
      array: Array;
      data: Data;
   };
}
export type RegisterServerComponent<Type extends ServerComponentType, Array extends _ServerComponentArray<object, object, unknown>, Data extends object> = {
   [K in Type]: {
      array: Array;
      data: Data;
   };
}

// Use a conditional type to force distribution (wtf) (minor @Hack)
export type ClientComponentArray<T extends ClientComponentType = ClientComponentType> = ClientComponentRegistry[T]["array"];
export type ServerComponentArray<T extends ServerComponentType = ServerComponentType> = T extends ServerComponentType ? ServerComponentRegistry[T]["array"] : never;
export type ComponentArray = ClientComponentArray | ServerComponentArray;

const B: ClientComponentRegistry[ClientComponentType]["array"] = 1;

const clientComponentRegistry = {} as { [T in ClientComponentType]: ClientComponentArray<T> };
const serverComponentRegistry = {} as { [T in ServerComponentType]: ServerComponentArray<T> };

// export type ClientComponentArray<T extends ClientComponentType = ClientComponentType> = typeof clientComponentRegistry[T];
// export type ServerComponentArray<T extends ServerComponentType = ServerComponentType> = typeof serverComponentRegistry[T];
// export type ComponentArray = ClientComponentArray | ServerComponentArray;

export const COMPONENT_ARRAYS: Array<ComponentArray> = [];

// @CLEANUP: fix clientcomponentarray and servercomponentarray being based on runtime values
// @CLEANUP: Use InstanceType instead of throwing away information

export function registerClientComponentArray<T extends ClientComponentType, C extends new (...args: any[]) => ClientComponentArray<T>>(componentType: T, prototype: C, ...args: ConstructorParameters<C>): ClientComponentArray<T> {
   let componentArray = clientComponentRegistry[componentType];

   if (componentArray === undefined) {
      componentArray = new prototype(...args);
      clientComponentRegistry[componentType] = componentArray;

      COMPONENT_ARRAYS.push(componentArray);
   }

   return componentArray;
}

export function registerServerComponentArray<T extends ServerComponentType, C extends new (...args: any[]) => ServerComponentArray<T>>(componentType: T, prototype: C, ...args: ConstructorParameters<C>): ServerComponentArray<T> {
   let componentArray = serverComponentRegistry[componentType];

   if (componentArray === undefined) {
      componentArray = new prototype(...args);
      serverComponentRegistry[componentType] = componentArray;

      COMPONENT_ARRAYS.push(componentArray);
   }

   return componentArray;
}

export function getClientComponentArray<T extends ClientComponentType>(componentType: T): ClientComponentArray<T> {
   return clientComponentRegistry[componentType];
}

export function getServerComponentArray<T extends ServerComponentType>(componentType: T): ServerComponentArray<T> {
   return serverComponentRegistry[componentType];
}