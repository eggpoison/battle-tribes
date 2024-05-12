export const RESEARCH_ORB_COMPLETE_TIME = 1.25;
export const RESEARCH_ORB_AMOUNTS = [1, 3, 5];

export enum ResearchOrbSize {
   small,
   medium,
   large
}

export function getRandomResearchOrbSize(): number {
   let size: ResearchOrbSize = 0;
   while (Math.random() < 0.5 && size < ResearchOrbSize.large) {
      size++;
   }
   return size;
}