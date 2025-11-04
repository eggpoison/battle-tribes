import { Tech } from "battletribes-shared/techs";
import { playerTribe } from "../../../game/tribes";

interface TechTreeProgressBarProps {
   readonly techInfo: Tech;
}

const TechTreeProgressBar = (props: TechTreeProgressBarProps) => {
   const techInfo = props.techInfo;
   
   const studyProgress = playerTribe.techTreeUnlockProgress[techInfo.id]?.studyProgress || 0;
   
   return <div className="study-progress-bar-bg">
      <p className="research-progress">{studyProgress}/{techInfo.researchStudyRequirements}</p>
      <div style={{"--study-progress": studyProgress / techInfo.researchStudyRequirements} as React.CSSProperties} className="study-progress-bar"></div>
   </div>;
}

export default TechTreeProgressBar;