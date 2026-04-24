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

export type RegisterClientComponent<Type extends ClientComponentType, Array extends _ClientComponentArray<object, object, unknown>> = {
   [K in Type]: Array;
}
export type RegisterServerComponent<Type extends ServerComponentType, Array extends _ServerComponentArray<object, object, unknown>> = {
   [K in Type]: Array;
}

export type ClientComponentArray<T extends ClientComponentType = ClientComponentType> = ClientComponentRegistry[T];
export type ServerComponentArray<T extends ServerComponentType = ServerComponentType> = ServerComponentRegistry[T];
export type ComponentArray = ClientComponentArray | ServerComponentArray;

// @HACK: "T extends any" so the things work for multiple component types
export type ClientComponentData<T extends ClientComponentType = ClientComponentType> = T extends any ? ClientComponentRegistry[T] extends _ClientComponentArray<any, infer Data, any> ? Data : never : never;
export type ServerComponentData<T extends ServerComponentType = ServerComponentType> = T extends any ? ServerComponentRegistry[T] extends _ServerComponentArray<any, infer Data, any> ? Data : never : never;

const clientComponentRegistry = {} as { [T in ClientComponentType]: ClientComponentArray<T> };
const serverComponentRegistry = {} as { [T in ServerComponentType]: ServerComponentArray<T> };

export const COMPONENT_ARRAYS: Array<ComponentArray> = [];

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