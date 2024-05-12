"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomResearchOrbSize = exports.ResearchOrbSize = exports.RESEARCH_ORB_AMOUNTS = exports.RESEARCH_ORB_COMPLETE_TIME = void 0;
exports.RESEARCH_ORB_COMPLETE_TIME = 1.25;
exports.RESEARCH_ORB_AMOUNTS = [1, 3, 5];
var ResearchOrbSize;
(function (ResearchOrbSize) {
    ResearchOrbSize[ResearchOrbSize["small"] = 0] = "small";
    ResearchOrbSize[ResearchOrbSize["medium"] = 1] = "medium";
    ResearchOrbSize[ResearchOrbSize["large"] = 2] = "large";
})(ResearchOrbSize = exports.ResearchOrbSize || (exports.ResearchOrbSize = {}));
function getRandomResearchOrbSize() {
    let size = 0;
    while (Math.random() < 0.5 && size < ResearchOrbSize.large) {
        size++;
    }
    return size;
}
exports.getRandomResearchOrbSize = getRandomResearchOrbSize;
