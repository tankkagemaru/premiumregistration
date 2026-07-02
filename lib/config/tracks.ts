/**
 * The three selectable intent tracks. Order here is the display order on the
 * landing intent selector. To turn a track off (e.g. hide Corporate), set
 * `enabled: false` — the chip disappears and its conditional section is skipped.
 */
export type TrackId = "english" | "university" | "corporate";

export interface TrackConfig {
  id: TrackId;
  title: string;
  blurb: string;
  icon: "BookOpen" | "GraduationCap" | "Briefcase"; // lucide-react icon name
  enabled: boolean;
}

export const TRACKS: TrackConfig[] = [
  {
    id: "english",
    title: "English program",
    blurb: "General, Business, and IELTS preparation courses.",
    icon: "BookOpen",
    enabled: true,
  },
  {
    id: "university",
    title: "Universities",
    blurb: "Placement at our Malaysian partner universities.",
    icon: "GraduationCap",
    enabled: true,
  },
  {
    id: "corporate",
    title: "Corporate training",
    blurb: "HRDF-claimable programs for your team.",
    icon: "Briefcase",
    enabled: true, // baked-in assumption: corporate is in v1
  },
];

export const ENABLED_TRACKS = TRACKS.filter((t) => t.enabled);
