import { Tech } from "battletribes-shared/techs";
import { useEffect, useState } from "react";
import TechTreeProgressBar from "./tech-tree/TechTreeProgressBar";
import { playerTribe } from "../../game/tribes";

export let TechInfocard_setSelectedTech: (tech: Tech | null) => void = () => {};

const TechInfocard = () => {
   const [selectedTech, setSelectedTech] = useState<Tech | null>(null);
   const [studyProgress, setStudyProgress] = useState(0);
   // @Incomplete doesn't refresh on study progress increase

   useEffect(() => {
      TechInfocard_setSelectedTech = (tech: Tech | null): void => {
         setSelectedTech(tech);

         if (tech !== null) {
            setStudyProgress(playerTribe.techTreeUnlockProgress[tech.id]?.studyProgress || 0);
         }
      }
   }, []);

   if (selectedTech === null) {
      return null;
   }

   return <div id="tech-infocard" className="infocard">
      {studyProgress < selectedTech.researchStudyRequirements ? <>
         <div className="flex">
            <h2>{selectedTech.name}</h2>
            <img src={require("../../images/tech-tree/" + selectedTech.iconSrc)} alt="" />
         </div>
         <TechTreeProgressBar techInfo={selectedTech} />
      </> : <>
         <div className="flex">
            <h2>Research Complete!</h2>
            <img src={require("../../images/tech-tree/" + selectedTech.iconSrc)} alt="" />
         </div>
      </>}
   </div>;
}

export default TechInfocard;