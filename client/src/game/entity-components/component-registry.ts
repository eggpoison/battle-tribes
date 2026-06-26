import { ServerComponentType } from "../../../../shared/src/components";
import { assert } from "../../../../shared/src/utils";
import { ClientComponentType } from "./client-component-types";
import ClientComponentArray from "./ClientComponentArray";
import ServerComponentArray from "./ServerComponentArray";

export interface ClientComponentRegistry {
   // To be extended
}
export interface ServerComponentRegistry {
   // To be extended
}

export type RegisterClientComponent<Type extends ClientComponentType, Array extends ClientComponentArray<object, object>> = Record<Type, Array>;
export type RegisterServerComponent<Type extends ServerComponentType, Array extends ServerComponentArray<object, object>> = Record<Type, Array>;

export type ClientComponentArrayByType<T extends ClientComponentType = ClientComponentType> = ClientComponentRegistry[T];
export type ServerComponentArrayByType<T extends ServerComponentType = ServerComponentType> = ServerComponentRegistry[T];

export type ComponentArray = ClientComponentArrayByType | ServerComponentArrayByType;

// @HACK: "T extends any" so the things work for multiple component types
export type ClientComponentData<T extends ClientComponentType = ClientComponentType> = T extends any ? ClientComponentRegistry[T] extends ClientComponentArray<any, infer Data> ? Data : never : never;
export type ServerComponentData<T extends ServerComponentType = ServerComponentType> = T extends any ? ServerComponentRegistry[T] extends ServerComponentArray<any, infer Data> ? Data : never : never;

const clientComponentRegistry: Partial<{ [T in ClientComponentType]: ClientComponentArrayByType<T> }> = {};
const serverComponentRegistry: Partial<{ [T in ServerComponentType]: ServerComponentArrayByType<T> }> = {};

export const COMPONENT_ARRAYS: ComponentArray[] = [];

// @hack: the ignoring
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function registerClientComponentArray<T extends ClientComponentType, C extends object>(componentType: T, componentArray: C): C {
   const registeredComponentArray = clientComponentRegistry[componentType];

   if (registeredComponentArray === undefined) {
      clientComponentRegistry[componentType] = componentArray as ClientComponentArrayByType<T>;
      COMPONENT_ARRAYS.push(componentArray as ClientComponentArrayByType<T>);

      return componentArray;
   }

   return registeredComponentArray as C;
}

// @hack: the ignoring
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function registerServerComponentArray<T extends ServerComponentType, C extends object>(componentType: T, componentArray: C): C {
   const registeredComponentArray = serverComponentRegistry[componentType];

   if (registeredComponentArray === undefined) {
      serverComponentRegistry[componentType] = componentArray as ServerComponentArrayByType<T>;
      COMPONENT_ARRAYS.push(componentArray as ServerComponentArrayByType<T>);

      return componentArray;
   }

   return registeredComponentArray as C;
}

export function getClientComponentArray<T extends ClientComponentType>(componentType: T): ClientComponentArrayByType<T> {
   assert(clientComponentRegistry[componentType] !== undefined);
   return clientComponentRegistry[componentType];
}

export function getServerComponentArray<T extends ServerComponentType>(componentType: T): ServerComponentArrayByType<T> {
   assert(serverComponentRegistry[componentType] !== undefined);
   return serverComponentRegistry[componentType];
}