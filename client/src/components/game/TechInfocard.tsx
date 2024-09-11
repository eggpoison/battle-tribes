import { TechID, getTechByID } from "battletribes-shared/techs";
import { useEffect, useState } from "react";
import Game from "../../Game";
import TechTreeProgressBar from "./tech-tree/TechTreeProgressBar";

export let TechInfocard_setSelectedTech: (techID: TechID | null) => void = () => {};

const TechInfocard = () => {
   const [selectedTech, setSelectedTech] = useState<TechID | null>(null);
   const [studyProgress, setStudyProgress] = useState(0);
   // @Incomplete doesn't refresh on study progress increase

   useEffect(() => {
      TechInfocard_setSelectedTech = (techID: TechID | null): void => {
         setSelectedTech(techID);

         if (techID !== null) {
            setStudyProgress(Game.tribe.techTreeUnlockProgress[techID]?.studyProgress || 0);
         }
      }
   }, []);

   if (selectedTech === null) {
      return null;
   }

   const techInfo = getTechByID(selectedTech);

   return <div id="tech-infocard" className="infocard">
      {studyProgress < techInfo.researchStudyRequirements ? <>
         <div className="flex">
            <h2>{techInfo.name}</h2>
            <img src={require("../../images/tech-tree/" + techInfo.iconSrc)} alt="" />
         </div>
         <TechTreeProgressBar techInfo={techInfo} />
      </> : <>
         <div className="flex">
            <h2>Research Complete!</h2>
            <img src={require("../../images/tech-tree/" + techInfo.iconSrc)} alt="" />
         </div>
      </>}
   </div>;
}

export default TechInfocard;