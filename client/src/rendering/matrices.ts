// @Incomplete: Investigate being a float32array
export type Matrix3x3 = [number, number, number, number, number, number, number, number, number];

export function createIdentityMatrix(): Matrix3x3 {
   return [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
   ];
}

export function copyMatrix(matrix: Matrix3x3): Matrix3x3 {
   return [
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[3],
      matrix[4],
      matrix[5],
      matrix[6],
      matrix[7],
      matrix[8]
   ];
}

export function createRotationMatrix(rotation: number): Matrix3x3 {
   const sin = Math.sin(rotation);
   const cos = Math.cos(rotation);

   // return [
   //    sin, -cos, 0,
   //    cos, sin, 0,
   //    0, 0, 1
   // ];
   return [
      cos, -sin, 0,
      sin, cos, 0,
      0, 0, 1
   ];
}

export function overrideWithIdentityMatrix(matrix: Matrix3x3): void {
   matrix[0] = 1;
   matrix[1] = 0;
   matrix[2] = 0;
   matrix[3] = 0;
   matrix[4] = 1;
   matrix[5] = 0;
   matrix[6] = 0;
   matrix[7] = 0;
   matrix[8] = 1;
}

export function overrideWithRotationMatrix(matrix: Matrix3x3, rotation: number): void {
   const sin = Math.sin(rotation);
   const cos = Math.cos(rotation);

   matrix[0] = cos;
   matrix[1] = -sin;
   matrix[2] = 0;
   matrix[3] = sin;
   matrix[4] = cos;
   matrix[5] = 0;
   matrix[6] = 0;
   matrix[7] = 0;
   matrix[8] = 1;
}

export function createTranslationMatrix(tx: number, ty: number): Matrix3x3 {
   return [
      1, 0, 0,
      0, 1, 0,
      tx, ty, 1
   ];
}

export function createScaleMatrix(sx: number, sy: number): Matrix3x3 {
   return [
      sx, 0, 0,
      0, sy, 0,
      0, 0, 1
   ];
}

export function matrixMultiplyInPlace(matrixA: Matrix3x3, matrixB: Matrix3x3): void {
   var a00 = matrixA[0 * 3 + 0];
   var a01 = matrixA[0 * 3 + 1];
   var a02 = matrixA[0 * 3 + 2];
   var a10 = matrixA[1 * 3 + 0];
   var a11 = matrixA[1 * 3 + 1];
   var a12 = matrixA[1 * 3 + 2];
   var a20 = matrixA[2 * 3 + 0];
   var a21 = matrixA[2 * 3 + 1];
   var a22 = matrixA[2 * 3 + 2];

   var b00 = matrixB[0 * 3 + 0];
   var b01 = matrixB[0 * 3 + 1];
   var b02 = matrixB[0 * 3 + 2];
   var b10 = matrixB[1 * 3 + 0];
   var b11 = matrixB[1 * 3 + 1];
   var b12 = matrixB[1 * 3 + 2];
   var b20 = matrixB[2 * 3 + 0];
   var b21 = matrixB[2 * 3 + 1];
   var b22 = matrixB[2 * 3 + 2];

   matrixB[0] = b00 * a00 + b01 * a10 + b02 * a20;
   matrixB[1] = b00 * a01 + b01 * a11 + b02 * a21;
   matrixB[2] = b00 * a02 + b01 * a12 + b02 * a22;
   matrixB[3] = b10 * a00 + b11 * a10 + b12 * a20;
   matrixB[4] = b10 * a01 + b11 * a11 + b12 * a21;
   matrixB[5] = b10 * a02 + b11 * a12 + b12 * a22;
   matrixB[6] = b20 * a00 + b21 * a10 + b22 * a20;
   matrixB[7] = b20 * a01 + b21 * a11 + b22 * a21;
   matrixB[8] = b20 * a02 + b21 * a12 + b22 * a22;
}