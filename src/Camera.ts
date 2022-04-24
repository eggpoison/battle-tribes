import { Point } from "./utils";

abstract class Camera {
   public static position: Point;

   public static setup(): void {
      this.position = new Point(0, 0);
   }
}

export default Camera;