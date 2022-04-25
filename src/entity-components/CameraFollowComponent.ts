import Camera from "../Camera";
import Component from "../Component";

class CameraFollowComponent extends Component {
   public onLoad(): void {
      Camera.followEntity(this.getEntity());
   }
}

export default CameraFollowComponent;