import { ServerComponentType, Entity } from "../../../../shared/src";
import { getEntityComponentArrays } from "../world";
import { ClientComponentType } from "./client-component-types";
import ClientComponentArray from "./ClientComponentArray";
import ServerComponentArray from "./ServerComponentArray";


export function callEntityOnUpdateFunctions(entity: Entity): void {
   const componentArrays = getEntityComponentArrays(entity);
   for (const componentArray of componentArrays) {
      if (typeof componentArray.onUpdate !== "undefined") {
         componentArray.onUpdate(entity);
      }
   }
}