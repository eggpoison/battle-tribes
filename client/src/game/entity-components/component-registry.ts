import { ServerComponentType } from "../../../../shared/src/components";
import { ClientComponentType } from "./client-component-types";
import ClientComponentArray from "./ClientComponentArray";
import ServerComponentArray from "./ServerComponentArray";

export interface ClientComponentRegistry {
   // To be extended
}
export interface ServerComponentRegistry {
   // To be extended
}

export type RegisterClientComponent<Type extends ClientComponentType, Array extends ClientComponentArray<object, object, unknown>> = {
   [K in Type]: Array;
}
export type RegisterServerComponent<Type extends ServerComponentType, Array extends ServerComponentArray<object, object, unknown>> = {
   [K in Type]: Array;
}

export type ClientComponentArrayByType<T extends ClientComponentType = ClientComponentType> = ClientComponentRegistry[T];
export type ServerComponentArrayByType<T extends ServerComponentType = ServerComponentType> = ServerComponentRegistry[T];
export type ComponentArray = ClientComponentArrayByType | ServerComponentArrayByType;

// @HACK: "T extends any" so the things work for multiple component types
export type ClientComponentData<T extends ClientComponentType = ClientComponentType> = T extends any ? ClientComponentRegistry[T] extends ClientComponentArray<any, infer Data, any> ? Data : never : never;
export type ServerComponentData<T extends ServerComponentType = ServerComponentType> = T extends any ? ServerComponentRegistry[T] extends ServerComponentArray<any, infer Data, any> ? Data : never : never;

const clientComponentRegistry = {} as { [T in ClientComponentType]: ClientComponentArrayByType<T> };
const serverComponentRegistry = {} as { [T in ServerComponentType]: ServerComponentArrayByType<T> };

export const COMPONENT_ARRAYS: ComponentArray[] = [];

export function registerClientComponentArray<T extends ClientComponentType, C extends new (...args: any[]) => ClientComponentArrayByType<T>>(componentType: T, prototype: C, ...args: ConstructorParameters<C>): ClientComponentArrayByType<T> {
   let componentArray = clientComponentRegistry[componentType];

   if (componentArray === undefined) {
      componentArray = new prototype(...args);
      clientComponentRegistry[componentType] = componentArray;

      COMPONENT_ARRAYS.push(componentArray);
   }

   return componentArray;
}

export function registerServerComponentArray<T extends ServerComponentType, C extends new (...args: any[]) => ServerComponentArrayByType<T>>(componentType: T, prototype: C, ...args: ConstructorParameters<C>): ServerComponentArrayByType<T> {
   let componentArray = serverComponentRegistry[componentType];

   if (componentArray === undefined) {
      componentArray = new prototype(...args);
      serverComponentRegistry[componentType] = componentArray;

      COMPONENT_ARRAYS.push(componentArray);
   }

   return componentArray;
}

export function getClientComponentArray<T extends ClientComponentType>(componentType: T): ClientComponentArrayByType<T> {
   return clientComponentRegistry[componentType];
}

export function getServerComponentArray<T extends ServerComponentType>(componentType: T): ServerComponentArrayByType<T> {
   return serverComponentRegistry[componentType];
}