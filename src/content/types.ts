// Модель навчального вмісту. Інтерфейс і рушій не містять умов чи ключів —
// усе приходить із JSON-пакетів у public/content/ (див. docs/CONTENT.md).

/** Обмежений текстовий формат: абзаци, **жирний**, *курсив*, $формула$, $$формула$$. */
export type RichText = string;

export type QuestionType = 'single_choice' | 'matching' | 'numeric';

export interface ImageAsset {
  id: string;
  kind: 'image';
  /** Відносний шлях від папки набору або https-адреса. */
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: RichText;
}

export interface ChoiceOption {
  id: string;
  content: RichText;
}

export interface MatchingRow {
  id: string;
  content: RichText;
}

export type NumericRule =
  | { mode: 'exact'; allowFractions?: boolean }
  | { mode: 'tolerance'; tolerance: string; allowFractions?: boolean };

export type AnswerKey =
  | { optionId: string }
  | { pairs: Record<string, string> }
  | { value: string };

interface QuestionBase {
  id: string;
  type: QuestionType;
  statement: RichText;
  assets?: ImageAsset[];
  maxPoints: number;
  textExplanation?: RichText | null;
  explanationVideoId?: string | null;
}

export interface SingleChoiceQuestion extends QuestionBase {
  type: 'single_choice';
  options: ChoiceOption[];
  answerKey: { optionId: string };
}

export interface MatchingQuestion extends QuestionBase {
  type: 'matching';
  matchingRows: MatchingRow[];
  matchingOptions: ChoiceOption[];
  /** Чи можна один варіант (А–Д) призначити кільком рядкам. Задається даними, не вгадується. */
  allowOptionReuse: boolean;
  answerKey: { pairs: Record<string, string> };
}

export interface NumericQuestion extends QuestionBase {
  type: 'numeric';
  numericRule: NumericRule;
  answerKey: { value: string };
}

export type Question = SingleChoiceQuestion | MatchingQuestion | NumericQuestion;

export type SimulationReadiness = 'complete' | 'demo' | 'incomplete';

export interface Simulation {
  id: string;
  title: string;
  subject: string;
  version: string;
  durationSeconds: number;
  orderedQuestionIds: string[];
  referenceMaterialId: string | null;
  scoringProfileId: string;
  conversionTableId?: string | null;
  readiness: SimulationReadiness;
  isDemo: boolean;
  source: { kind: 'imported' | 'demo'; note: string };
}

export interface ScoringProfile {
  id: string;
  questionCount: number;
  maxTotal: number;
  layout: { from: number; to: number; type: QuestionType; maxPoints: number; optionCount?: number; rowCount?: number }[];
}

export type ReferenceMaterial =
  | { id: string; title: string; kind: 'pdf'; src: string; downloadable: boolean }
  | { id: string; title: string; kind: 'pages'; pages: RichText[]; downloadSrc?: string | null }
  | { id: string; title: string; kind: 'images'; pages: { src: string; alt: string }[]; downloadSrc?: string | null };

export interface ConversionTable {
  id: string;
  year: number;
  source: string;
  maxPrimary: number;
  /** Ключ — первинний бал, значення — бал НМТ 100–200 або null («не подолано поріг»). */
  map: Record<string, number | null>;
}

export interface ContentPackage {
  schemaVersion: 1;
  simulation: Simulation;
  questions: Question[];
  scoringProfiles: ScoringProfile[];
  referenceMaterials: ReferenceMaterial[];
  conversionTables?: ConversionTable[];
}

export type MediaReadiness = 'ready' | 'needs_review' | 'missing';

export interface VideoMedia {
  id: string;
  kind: 'video' | 'embed';
  title?: string;
  /** Для розробки: шлях у папці ./media (обслуговується локальним медіасервером). */
  localPath?: string | null;
  /** Для опублікованого сайту: https-адреса файлу MP4 або дозволеного вбудованого плеєра. */
  publicUrl?: string | null;
  poster?: string | null;
  captions?: { src: string; srclang: string; label: string }[];
  mimeType?: string;
  readiness: MediaReadiness;
  /** Позначка для технічних тестових кліпів, які не є поясненням задачі. */
  technicalTestClip?: boolean;
}

/** Окрема карта відео: simulationId → questionId → explanationVideoId → файл/адреса. */
export interface VideoMap {
  schemaVersion: 1;
  simulationId: string;
  bindings: { questionId: string; explanationVideoId: string; verifiedBy?: string | null }[];
  media: VideoMedia[];
}

export interface CatalogEntry {
  id: string;
  title: string;
  /** Шлях до пакета відносно public/content/. Відсутній — набір ще не додано. */
  package?: string | null;
  videoMap?: string | null;
}

export interface Catalog {
  schemaVersion: 1;
  defaultSimulationId: string;
  demoSimulationId?: string | null;
  entries: CatalogEntry[];
}
