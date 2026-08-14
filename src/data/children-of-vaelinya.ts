export interface StarterStory {
  title: string;
  href: string;
}

export interface ChildStoryGroup {
  slug: string;
  name: string;
  description: string;
  starter?: StarterStory;
  programmePositions: number[];
}

export const childStoryGroups: ChildStoryGroup[] = [
  {
    slug: 'lina',
    name: 'Lina',
    description: 'Eight stories of listening, memory, crossings, courage, and return.',
    programmePositions: [],
  },
  {
    slug: 'fina',
    name: 'Fina',
    description: 'Eight precise, practical stories about noticing what others miss.',
    starter: { title: 'Fina and the Smallest Bell', href: '/read/children/fina-and-the-smallest-bell/' },
    programmePositions: [1, 14, 23, 29, 36, 43, 52],
  },
  {
    slug: 'elara',
    name: 'Elara',
    description: 'Eight luminous stories about attention, music, wonder, and difficult signals.',
    starter: { title: 'Elara and the Star-Path Under the Hill', href: '/read/children/elara-and-the-star-path-under-the-hill/' },
    programmePositions: [2, 9, 20, 30, 37, 44, 50],
  },
  {
    slug: 'nira',
    name: 'Nira',
    description: 'Eight reflective stories about feelings, bearings, patterns, and quiet truth.',
    starter: { title: 'Nira and the Lake That Listened', href: '/read/children/nira-and-the-lake-that-listened/' },
    programmePositions: [3, 10, 17, 31, 38, 45, 51],
  },
  {
    slug: 'kaelen',
    name: 'Kaelen',
    description: 'Eight active stories about movement, steadiness, danger, and reading the moment well.',
    starter: { title: 'Kaelen and the Door in the Wind', href: '/read/children/kaelen-and-the-door-in-the-wind/' },
    programmePositions: [4, 12, 18, 25, 39, 46, 53],
  },
  {
    slug: 'valen',
    name: 'Valen',
    description: 'Eight stories about fairness, promises, identity, records, and what must be put right.',
    starter: { title: 'Valen and the Broken Promise Stone', href: '/read/children/valen-and-the-broken-promise-stone/' },
    programmePositions: [5, 11, 21, 26, 33, 47, 54],
  },
  {
    slug: 'reo',
    name: 'Reo',
    description: 'Eight playful stories about mistakes, puzzles, routes, humour, and unexpected solutions.',
    starter: { title: 'Reo and the Song That Went the Wrong Way', href: '/read/children/reo-and-the-song-that-went-the-wrong-way/' },
    programmePositions: [6, 13, 19, 27, 34, 41, 55],
  },
  {
    slug: 'liana',
    name: 'Liana',
    description: 'Eight gentle stories about rooms, shelter, repair, waiting, and making space safe again.',
    starter: { title: 'Liana and the Room That Held Its Breath', href: '/read/children/liana-and-the-room-that-held-its-breath/' },
    programmePositions: [7, 15, 22, 28, 35, 42, 49],
  },
];

export const togetherGroup: ChildStoryGroup = {
  slug: 'together',
  name: 'All Eight Together',
  description: 'Eight adventures in which the children face larger problems together.',
  programmePositions: [8, 16, 24, 32, 40, 48, 56, 57],
};

export const allChildrenOfVaelinyaGroups = [...childStoryGroups, togetherGroup];

export function programmeStorySlug(storyId: string): string {
  const filename = storyId.split('/').pop() ?? storyId;
  return filename.replace(/\.md$/, '').replace(/^\d+-/, '');
}

export function nestedProgrammeStoryUrl(groupSlug: string, localStoryNumber: number, storyId: string): string {
  const localPrefix = String(localStoryNumber).padStart(2, '0');
  return `/read/children-of-vaelinya/${groupSlug}/${localPrefix}-${programmeStorySlug(storyId)}/`;
}

export function nestedLinaStoryUrl(storyNumber: number, storyId: string): string {
  const filename = storyId.split('/').pop() ?? storyId;
  const slug = filename.replace(/\.md$/, '').replace(/^\d+-/, '');
  return `/read/children-of-vaelinya/lina/${String(storyNumber).padStart(2, '0')}-${slug}/`;
}
