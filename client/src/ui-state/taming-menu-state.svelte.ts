import { TamingSkillID } from "webgl-test-shared";
import TamingTier0Icon from "../images/entities/miscellaneous/taming-tier-0.png";
import TamingTier1Icon from "../images/entities/miscellaneous/taming-tier-1.png";
import TamingTier2Icon from "../images/entities/miscellaneous/taming-tier-2.png";
import TamingTier3Icon from "../images/entities/miscellaneous/taming-tier-3.png";
import { TamingSkillLearning } from "../game/entity-components/server-components/TamingComponent";

export const TAMING_TIER_ICONS: Record<number, any> = {
   0: TamingTier0Icon,
   1: TamingTier1Icon,
   2: TamingTier2Icon,
   3: TamingTier3Icon
};

export const SKILL_TRANSFORM_SCALE_FACTOR = 0.5;

export const tamingMenuState = $state({
   tamingTier: 0,
   name: "",
   foodEatenInTier: 0,
   acquiredSkills: new Array<TamingSkillID>(),
   skillLearningArray: new Array<TamingSkillLearning>()
});