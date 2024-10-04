import Component from "./Component";
import { PacketReader } from "battletribes-shared/packets";

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
   
   public abstract updateFromData(reader: PacketReader, isInitialData: boolean): void;

   /** Updates the player instance from server data */
   public updatePlayerFromData?(reader: PacketReader): void;
   /** Called on the player instance after all components are updated from server data */
   public updatePlayerAfterData?(): void;

}

export default ServerComponent;