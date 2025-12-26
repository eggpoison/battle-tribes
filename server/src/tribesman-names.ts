import { TribesmanTitle } from "../../shared/src/titles";
import { TribeType } from "../../shared/src/tribes";
import { randItem } from "../../shared/src/utils";
import { TribeMemberComponentArray } from "./components/TribeMemberComponent";
import Tribe from "./Tribe";

// @Incomplete: different names for workers and warriors

// @Incomplete: frostling tribe name: "Iceberk"

const SCRAPPY_NAMES = [
   "Scrap",
   "Klik",
   "Boltz",
   "Clunk",
   "Spindle",
   "Patch",
   "Sprocket",
   "Nut",
   "Bit",
   "Blinky",
   "Gidget",
   "Buzzlet",
   "Clanky",
   "Scrapple",
   "Jibby",
   "Tink",
   "Sporky",
   "Twitchy",
   "Nibbit",
   "Blinky",
   "Fizzle",
   "Chippy"
];

// @Cleanup: location?
const COGWALKER_NAMES = [
   "Sparky",
   "Bill Cogsby",
   "Gearlok the Destroyer",
   "Axel",
   "Brassik",
   "Clanker",
   "Grindr",
   "Torque",
   "Mechus",
   "Pistorius",
   "Weldon",
   "Thunderclock"
];

const STRIDER_NAMES = [
   "Treadnaught",
   "Ironstrider",
   "Tri-Gear",
   "Blastrek",
   "Warstalk",
   "Gunlok",
   "Thundraxx",
   "Tripodion",
   "Ironshot",
   "Gearstride",
   "Third-Leg"
];

const PLAINSPEOPLE_NAMES: ReadonlyArray<string> = [
   "Oda",
   "Toffle",
   "Marny",
   "Bilber",
   "Doffin",
   "Bramble",
   "Jorry",
   "Nuddle",
   "Wuddle",
   "Pottle"
];

// @INCOMPLETE: which tribe should have these types of names?
// "Grug",
// "Og",
// "Urgh",
// "Blurgh",

const BARBARIAN_NAMES: ReadonlyArray<string> = [
   "RAAAAGH",
   "Bjorn",
   "HOUUUURGH",
   "Erik",
   "Ivar",
   "Agmundr",
   "Harald",
   "Frednog",
   "Snigvut",
   "Sparagus", // like asparagus. Also sounds kind of Spartan-y,
   "Biggus", // biggus diggus
];

const FROSTLING_NAMES: ReadonlyArray<string> = [
   "Fraazgakk",
   "Fruzeek",
   "Grivve",
   "Frum"
];

const GOBLIN_NAMES: ReadonlyArray<string> = [
   "Vuzz",
   "Klanzogz",
   "Striex",
   "Slokx"
];

const DWARF_NAMES: ReadonlyArray<string> = [
   "Durin",
   "Thorin",
   "Dugim",
   "Gimli",
   "Baldrik",
   "Bronin",
   "Fundin",
   "Garim",
   "Nain",
   "Marrin",
   "Stigr",
   "Brokk",
   "Durrak",
   "Grottin",
   "Hraldir",
   "Kromlin",
   "Nordri",
   "Ulgrim",
   "Varrik",
   "Wulfrin",
   "Borrik",
   "Erdrik",
   "Thrain",
   "Orik",
   "Skorr",
   "Frerin",
   "Torrin",
   "Zarn",
   "Grimm",
   "Haddar",
   "Harnum"
];

const TITLE_DISPLAY_OPTIONS: Record<TribesmanTitle, ReadonlyArray<string>> = {
   [TribesmanTitle.builder]: ["Builder", "Object Constructor", "Manipulator of Materials"],
   [TribesmanTitle.berrymuncher]: ["Berry-muncher", "Muncher of Berries"],
   [TribesmanTitle.bloodaxe]: ["Bloodaxe", "Shedder of Blood"],
   [TribesmanTitle.deathbringer]: ["Deathbringer", "Precursor of Doom", "Enemy of Life"],
   [TribesmanTitle.gardener]: ["Gardener", "Maintainer of Plants", "Friend to Plants"],
   [TribesmanTitle.packrat]: ["Packrat", "Carryer of Things"],
   [TribesmanTitle.shrewd]: ["the Shrewd", "Haver of Brains"],
   [TribesmanTitle.sprinter]: ["Owner of the Fast Legs", "Haver of Legs", "the Fast"],
   [TribesmanTitle.wellful]: ["of Good Health", "the Wellful"],
   [TribesmanTitle.winterswrath]: ["Winterswrath", "Antithesis of Cold", "Torment of Winter"],
   [TribesmanTitle.yetisbane]: ["Yetisbane", "Slayer of Yetis"]
};

const TITLELESS_ADJECTIVES: ReadonlyArray<string> = [
   "Useless",
   "Weak",
   "Puny",
   "Small",
   "Frail",
   "Sickly",
   "Inebriated",
   "Demented",
   "Wimp",
   "Weed",
   "Twig",
   "Ant",
   "Rickety",
   "Elderly",
   "Pale",
   "Feeble",
   "Poor",
   "Thing",
   "Pebble",
   "Thin",
   "Anorexic",
   "Depressed",
   "Struggler",
   "Limp",
   "Lame"
];

export function generateTribesmanName(tribeType: TribeType): string {
   let nameArray: ReadonlyArray<string>;
   switch (tribeType) {
      case TribeType.plainspeople: {
         nameArray = PLAINSPEOPLE_NAMES;
         break;
      }
      case TribeType.barbarians: {
         nameArray = BARBARIAN_NAMES;
         break;
      }
      case TribeType.frostlings: {
         nameArray = FROSTLING_NAMES;
         break;
      }
      case TribeType.goblins: {
         nameArray = GOBLIN_NAMES;
         break;
      }
      case TribeType.dwarves: {
         nameArray = DWARF_NAMES;
      }
   }
   
   // Pick a random base name
   let name = nameArray[Math.floor(Math.random() * nameArray.length)];

   if (Math.random() < 0.3) {
      name += "son";
   }

   // Add the untitled adjective
   const descriptor = TITLELESS_ADJECTIVES[Math.floor(Math.random() * TITLELESS_ADJECTIVES.length)];
   name += " the " + descriptor;

   return name;
}

export function addTitleToTribesmanName(name: string, title: TribesmanTitle): string {
   // @Incomplete: remove the untitled adjective
         
   const displayOptions = TITLE_DISPLAY_OPTIONS[title];
   const displayText = displayOptions[Math.floor(Math.random() * displayOptions.length)];
   return name + ", " + displayText;
}

const nameAlreadyExists = (tribe: Tribe, name: string): boolean => {
   for (const tribeMember of tribe.entities) {
      if (TribeMemberComponentArray.hasComponent(tribeMember)) {
         const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribeMember);
         if (tribeMemberComponent.name === name) {
            return true;
         }
      }
   }

   return false;
}

const generateAutomatonName = (tribe: Tribe, names: ReadonlyArray<string>): string => {
   const baseName = randItem(names);
   
   for (let numDuplicates = 0; ; numDuplicates++) {
      const name = numDuplicates > 0 ? baseName + " " + (numDuplicates + 1) + ".0" : baseName;

      if (!nameAlreadyExists(tribe, name)) {
         return name;
      }
   }
}

export function generateScrappyName(tribe: Tribe): string {
   return generateAutomatonName(tribe, SCRAPPY_NAMES);
}

export function generateCogwalkerName(tribe: Tribe): string {
   return generateAutomatonName(tribe, COGWALKER_NAMES);
}