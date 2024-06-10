import Board from "../Board";
import Entity from "../Entity";
import { Matrix3x3, createIdentityMatrix, createRotationMatrix, createTranslationMatrix, matrixMultiply } from "./matrices";

const calculateEntityModelMatrix = (entity: Entity): Matrix3x3 => {
   let model = createRotationMatrix(entity.rotation);

   // @Incomplete: use render position
   const translation = createTranslationMatrix(entity.position.x, entity.position.y);
   model = matrixMultiply()
}

export function updateRenderPartMatrices(frameProgress: number): void {
   for (let i = 0; i < Board.sortedEntities.length; i++) {
      const entity = Board.sortedEntities[i];
      
      // @Hack: shouldn't be done here
      const entityMatrix = calculateEntityModelMatrix
      entity.updateRenderPosition(frameProgress);

      // Calculate render info for all render parts
      // Update render parts from parent -> child
      const remainingRenderParts: Array<RenderPart> = [];
      for (const child of entity.children) {
         remainingRenderParts.push(child);
      }
      while (remainingRenderParts.length > 0) {
         const renderObject = remainingRenderParts[0];
         renderObject.update();

         for (const child of renderObject.children) {
            remainingRenderParts.push(child);
         }

         remainingRenderParts.splice(0, 1);
      }
   }
}