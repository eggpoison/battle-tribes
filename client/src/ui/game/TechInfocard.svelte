import { Tech } from "webgl-test-shared/src/techs";
import { useEffect, useState } from "react";
import TechTreeProgressBar from "./tech-tree/TechTreeProgressBar";
import { playerTribe } from "../../game/tribes";

const TechInfocard = () => {
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