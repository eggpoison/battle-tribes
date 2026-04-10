// @Incomplete: Investigate being a float32array
// Was originally a 3x3 matrix, but the 3rd, 6th and 9th elements were always fixed so I changed it to 3x2
export type Matrix3x2 = [number, number, number, number, number, number];

export function createIdentityMatrix(): Matrix3x2 {
   return [
      1, 0,
      0, 1,
      0, 0
   ];
}

export function createRotationMatrix(rotation: number): Matrix3x2 {
   const sin = Math.sin(rotation);
   const cos = Math.cos(rotation);

   // return [
   //    sin, -cos, 0,
   //    cos, sin, 0,
   //    0, 0, 1
   // ];
   return [
      cos, -sin,
      sin, cos,
      0, 0
   ];
}

export function overrideWithIdentityMatrix(matrix: Matrix3x2): void {
   matrix[0] = 1;
   matrix[1] = 0;
   matrix[2] = 0;
   matrix[3] = 1;
   matrix[4] = 0;
   matrix[5] = 0;
}

export function createTranslationMatrix(tx: number, ty: number): Matrix3x2 {
   return [
      1, 0,
      0, 1,
      tx, ty
   ];
}

export function createScaleMatrix(sx: number, sy: number): Matrix3x2 {
   return [
      sx, 0,
      0, sy,
      0, 0
   ];
}

export function matrixMultiplyInPlace(matrixA: Readonly<Matrix3x2>, matrixB: Matrix3x2): void {
   const a00 = matrixA[0];
   const a01 = matrixA[1];
   const a10 = matrixA[2];
   const a11 = matrixA[3];
   const a20 = matrixA[4];
   const a21 = matrixA[5];

   const b00 = matrixB[0];
   const b01 = matrixB[1];
   const b10 = matrixB[2];
   const b11 = matrixB[3];
   const b20 = matrixB[4];
   const b21 = matrixB[5];

   matrixB[0] = b00 * a00 + b01 * a10;
   matrixB[1] = b00 * a01 + b01 * a11;
   matrixB[2] = b10 * a00 + b11 * a10;
   matrixB[3] = b10 * a01 + b11 * a11;
   matrixB[4] = b20 * a00 + b21 * a10 + a20;
   matrixB[5] = b20 * a01 + b21 * a11 + a21;
}

export function overrideMatrix(sourceMatrix: Readonly<Matrix3x2>, targetMatrix: Matrix3x2): void {
   targetMatrix[0] = sourceMatrix[0];
   targetMatrix[1] = sourceMatrix[1];
   targetMatrix[2] = sourceMatrix[2];
   targetMatrix[3] = sourceMatrix[3];
   targetMatrix[4] = sourceMatrix[4];
   targetMatrix[5] = sourceMatrix[5];
}