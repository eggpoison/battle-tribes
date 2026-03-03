let fps = 0;
let average = 0;
let min = 0;
let max = 0;

export const frameGraphState = {
   get fps() {
      return fps;
   },
   setFPS(newFPS: number): void {
      fps = newFPS;
   },

   get average() {
      return average;
   },
   setAverage(newAverage: number): void {
      average = newAverage;
   },
   
   get min() {
      return min;
   },
   setMin(newMin: number): void {
      min = newMin;
   },

   get max() {
      return max;
   },
   setMax(newMax: number): void {
      max = newMax;
   },
};