import batch01 from './batch-01.json';
import batch02 from './batch-02.json';
import batch03 from './batch-03.json';
import batch04 from './batch-04.json';
import batch05 from './batch-05.json';
import batch06 from './batch-06.json';
import batch07 from './batch-07.json';
import batch08 from './batch-08.json';

export interface ShortStoryReleaseEntry {
  position: number;
  title: string;
  slug: string;
  description: string;
  publicUrl: string;
  heroImage: string;
  heroImageAlt: string;
  bodyMarkdown: string;
}

export const shortStories = [batch01, batch02, batch03, batch04, batch05, batch06, batch07, batch08]
  .flat() as ShortStoryReleaseEntry[];
