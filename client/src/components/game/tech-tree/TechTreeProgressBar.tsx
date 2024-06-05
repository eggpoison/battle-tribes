import { TechInfo } from "webgl-test-shared/dist/techs";
import Game from "../../../Game";

interface TechTreeProgressBarProps {
   readonly techInfo: TechInfo;
}

const TechTreeProgressBar = (props: TechTreeProgressBarProps) => {
   const techInfo = props.techInfo;
   
   const studyProgress = Game.tribe.techTreeUnlockProgress[techInfo.id]?.studyProgress || 0;
   
   return <div className="study-progress-bar-bg">
      <p className="research-progress">{studyProgress}/{techInfo.researchStudyRequirements}</p>
      <div style={{"--study-progress": studyProgress / techInfo.researchStudyRequirements} as React.CSSProperties} className="study-progress-bar"></div>
   </div>;
}

export default TechTreeProgressBar;