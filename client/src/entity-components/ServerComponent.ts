import Component from "./Component";
import { PacketReader } from "webgl-test-shared/dist/packets";

abstract class ServerComponent extends Component {
   public tintR = 0;
   public tintG = 0;
   public tintB = 0;

   public setTint(r: number, g: number, b: number): void {
      if (r !== this.tintR || g !== this.tintG || b !== this.tintB) {
         this.tintR = r;
         this.tintG = g;
         this.tintB = b;
         this.entity.recalculateTint();
         this.entity.dirty();
      }
   }

   public abstract padData(reader: PacketReader): void;
   
   public abstract updateFromData(reader: PacketReader): void;

   public updatePlayerFromData?(reader: PacketReader): void;
}

export default ServerComponent;