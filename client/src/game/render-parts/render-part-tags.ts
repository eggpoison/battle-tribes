import { assert, EntityTypeString } from "../../../../shared/src";
import { EntityRenderObject } from "../EntityRenderObject";
import { getEntityType } from "../world";
import { RenderPart } from "./render-parts";

const tagMap = new WeakMap<RenderPart, Array<string>>();

export function addRenderPartTag(renderPart: RenderPart, tag: string): void {
   const tags = tagMap.get(renderPart);
   if (tags !== undefined) {
      tags.push(tag);
   } else {
      tagMap.set(renderPart, [tag]);
   }
}

const getTags = (renderPart: RenderPart): Array<string> | undefined => {
   return tagMap.get(renderPart);
}

export function getRenderThingByTag(renderObject: EntityRenderObject, tag: string): RenderPart {
   for (const renderThing of renderObject.renderPartsByZIndex) {
      const tags = getTags(renderThing);
      assert(tags !== undefined);
      if (tags.includes(tag)) {
         return renderThing;
      }
   }

   throw new Error("No render part with tag '" + tag + "' could be found on entity type " + EntityTypeString[getEntityType(renderObject.entity)]);
}

export function getRenderThingsByTag(renderObject: EntityRenderObject, tag: string, expectedAmount?: number): Array<RenderPart> {
   const renderThings = new Array<RenderPart>();
   for (const renderThing of renderObject.renderPartsByZIndex) {
      const tags = getTags(renderThing);
      if (tags === undefined) {
         if (expectedAmount) {
            throw new Error();
         } else {
            continue;
         }
      }
      if (tags.includes(tag)) {
         renderThings.push(renderThing);
      }
   }

   if (expectedAmount !== undefined && renderThings.length !== expectedAmount) {
      throw new Error("Expected " + expectedAmount + " render parts with tag '" + tag + "' on " + EntityTypeString[getEntityType(renderObject.entity)] + " but got " + renderThings.length);
   }
   
   return renderThings;
}