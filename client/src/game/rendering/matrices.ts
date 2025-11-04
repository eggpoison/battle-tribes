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

export function copyMatrix(matrix: Matrix3x2): Matrix3x2 {
   return [
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[3],
      matrix[4],
      matrix[5]
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
   var a00 = matrixA[0 * 2 + 0];
   var a01 = matrixA[0 * 2 + 1];
   var a10 = matrixA[1 * 2 + 0];
   var a11 = matrixA[1 * 2 + 1];
   var a20 = matrixA[2 * 2 + 0];
   var a21 = matrixA[2 * 2 + 1];

   var b00 = matrixB[0 * 2 + 0];
   var b01 = matrixB[0 * 2 + 1];
   var b10 = matrixB[1 * 2 + 0];
   var b11 = matrixB[1 * 2 + 1];
   var b20 = matrixB[2 * 2 + 0];
   var b21 = matrixB[2 * 2 + 1];

   matrixB[0] = b00 * a00 + b01 * a10;
   matrixB[1] = b00 * a01 + b01 * a11;
   matrixB[2] = b10 * a00 + b11 * a10;
   matrixB[3] = b10 * a01 + b11 * a11;
   matrixB[4] = b20 * a00 + b21 * a10 + a20;
   matrixB[5] = b20 * a01 + b21 * a11 + a21;
}