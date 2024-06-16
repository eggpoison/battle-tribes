// @Incomplete: Investigate being a float32array
export type Matrix3x3 = [number, number, number, number, number, number, number, number, number];

export function createIdentityMatrix(): Matrix3x3 {
   return [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1
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

// @Speed: Garbage collection
export function matrixMultiply(matrixA: Matrix3x3, matrixB: Matrix3x3): Matrix3x3 {
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

   return [
     b00 * a00 + b01 * a10 + b02 * a20,
     b00 * a01 + b01 * a11 + b02 * a21,
     b00 * a02 + b01 * a12 + b02 * a22,
     b10 * a00 + b11 * a10 + b12 * a20,
     b10 * a01 + b11 * a11 + b12 * a21,
     b10 * a02 + b11 * a12 + b12 * a22,
     b20 * a00 + b21 * a10 + b22 * a20,
     b20 * a01 + b21 * a11 + b22 * a21,
     b20 * a02 + b21 * a12 + b22 * a22,
   ];
}