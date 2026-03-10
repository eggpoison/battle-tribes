import { Entity } from "../../../../shared/src";
import { getEntityComponentArrays } from "../entity-component-types";
import { getEntityType } from "../world";


export function callEntityOnUpdateFunctions(entity: Entity): void {
   const componentArrays = getEntityComponentArrays(getEntityType(entity));
   for (const componentArray of componentArrays) {
      if (typeof componentArray.onUpdate !== "undefined") {
         componentArray.onUpdate(entity);
      }
   }
}