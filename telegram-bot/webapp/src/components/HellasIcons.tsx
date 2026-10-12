import { forwardRef, type SVGProps, type ForwardRefExoticComponent, type RefAttributes } from 'react';

export type HellasIconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & { size?: number | string };
export type HellasIcon = ForwardRefExoticComponent<HellasIconProps & RefAttributes<SVGSVGElement>>;

/**
 * Original Hellas Study action glyphs, drawn on a 32-unit optical grid.
 * Chamfered seals, measured stems and open corners echo the architecture
 * without sacrificing the familiar meaning of small controls.
 * No paths or artwork are imported from an icon library.
 */
function glyph(name: string, paths: string[], accent?: string): HellasIcon {
  const Icon = forwardRef<SVGSVGElement, HellasIconProps>(function HellasGlyph(
    { size = 24, strokeWidth = 2, className = '', children, ...props }, ref,
  ) {
    return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"
      width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={Number(strokeWidth) * 4 / 3} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" className={`hs-glyph ${className}`}
      data-hs-icon={name} {...props}>
      {accent && <path d={accent} fill="currentColor" fillOpacity=".12" stroke="none" />}
      {paths.map((d, index) => <path key={index} d={d} />)}
      {children}
    </svg>;
  });
  Icon.displayName = `Hellas${name}`;
  return Icon;
}

const seal = 'M10 4H22L28 10V22L22 28H10L4 22V10Z';
const eye = 'M3.5 16C8 9 12 7.5 16 7.5S24 9 28.5 16C24 23 20 24.5 16 24.5S8 23 3.5 16Z';
const check = 'M8 16.5L13.5 22L25 9.5';
const columns = 'M5 27H27M8 23V16M16 23V10M24 23V5';

export const ArrowRight = glyph('forward', ['M5 16H26M19 9L26 16L19 23']);
export const ArrowLeft = glyph('back', ['M27 16H6M13 9L6 16L13 23']);
export const ArrowUpRight = glyph('enter', ['M8 24L24 8M12 8H24V20']);
export const ChevronDown = glyph('expand', ['M7 12L16 21L25 12']);
export const ChevronRight = glyph('next', ['M12 7L21 16L12 25']);
export const X = glyph('close', ['M8 8L24 24M24 8L8 24']);
export const Plus = glyph('add', ['M16 6V26M6 16H26']);
export const Check = glyph('check', [check]);
export const CheckCircle2 = glyph('confirmed', [seal, 'M9 16L14 21L23 11'], seal);
export const CircleX = glyph('incorrect', [seal, 'M11 11L21 21M21 11L11 21'], seal);
export const CircleAlert = glyph('attention', [seal, 'M16 9V17M16 22H16.1'], seal);
export const BadgeCheck = glyph('ready', ['M10 5H22L27 10V21L22 26H10L5 21V10Z', 'M10 15L14 19L22 11', 'M11 27L8 30M21 27L24 30']);
export const Info = glyph('note', [seal, 'M14 14H17V23M13 23H20M16 9H16.1']);
export const Eye = glyph('reveal', [eye, 'M20 16A4 4 0 1 1 12 16A4 4 0 1 1 20 16'], eye);
export const EyeOff = glyph('conceal', ['M6 12C10 8 13 7.5 16 7.5C21 7.5 25 11 28.5 16L25 20', 'M22 23C16 27 9 23 3.5 16L6 12', 'M6 5L26 27']);
export const Volume2 = glyph('sound', ['M4 12H9L16 7V25L9 20H4Z', 'M21 12C25 14 25 18 21 20', 'M25 7C32 12 32 20 25 25'], 'M4 12H9L16 7V25L9 20H4Z');
export const AudioLines = glyph('voice', ['M5 13V19M10.5 9V23M16 5V27M21.5 11V21M27 14V18']);
export const RotateCcw = glyph('repeat', ['M8 10A11 11 0 1 1 5 20', 'M8 4V11H15']);
export const Loader2 = glyph('loading', ['M16 5A11 11 0 0 1 27 16', 'M16 27A11 11 0 0 1 5 16']);
export const WifiOff = glyph('offline', ['M5 11C11 6 21 6 27 11M10 16C14 13 19 13 23 16M15 22L16 23L17 22', 'M5 4L27 28']);
export const House = glyph('home', ['M4 12L16 4L28 12M7 13V27H25V13M13 27V18H19V27', 'M4 28H28']);
export const UserRound = glyph('profile', ['M21 9A5 5 0 1 1 11 9A5 5 0 1 1 21 9', 'M6 27V24C6 18 26 18 26 24V27', 'M10 28H22']);
export const KeyRound = glyph('key', ['M14 10A5 5 0 1 1 4 10A5 5 0 1 1 14 10', 'M13 13L26 26L29 23M21 21L24 18']);
export const Paperclip = glyph('attachment', ['M12 23L22 13C28 7 23 2 17 8L7 18C-1 26 8 33 16 25L27 14', 'M11 22L21 12']);
export const Trash2 = glyph('remove', ['M5 9H27M12 8V4H20V8M8 12L10 28H22L24 12M14 14V23M19 14V23']);
export const Menu = glyph('menu', ['M5 8H27M5 16H23M5 24H27', 'M28 16H28.1']);
export const LayoutGrid = glyph('topics', ['M5 5H13V13H5ZM19 5H27V13H19ZM5 19H13V27H5ZM19 19H27V27H19Z']);
export const BookOpen = glyph('vocabulary', ['M16 8C12 5 7 4 3 6V25C8 23 12 24 16 27C20 24 24 23 29 25V6C25 4 20 5 16 8Z', 'M16 8V27M7 10L12 11M20 11L25 10']);
export const Layers = glyph('cards', ['M5 9L23 5L27 23L9 27ZM3 15L5 27L14 29', 'M11 13L20 11M12 18L22 16']);
export const ClipboardCheck = glyph('quiz', ['M10 6H6V28H26V6H22M12 3H20V9H12Z', 'M10 18L14 22L22 14']);
export const NotebookPen = glyph('homework', ['M17 5H5V28H25V17M9 10H15M9 15H13', 'M13 24L15 17L26 6L30 10L19 21Z']);
export const BarChart3 = glyph('progress', [columns]);
export const ChartNoAxesColumnIncreasing = BarChart3;
export const TrendingUp = glyph('growing', ['M4 25L12 17L17 20L28 8M20 8H28V16']);
export const Target = glyph('precision', ['M11 8L5 27M19 8L27 27M10 23C14 19 18 19 22 23', 'M19 6A3 3 0 1 1 13 6A3 3 0 1 1 19 6']);
export const Flame = glyph('streak', ['M5 21C10 29 25 30 28 20H5ZM22 20V16H27V20', 'M13 17C5 12 16 8 13 3C24 9 21 15 16 17Z']);
export const Sprout = glyph('beginning', ['M16 28V14M16 15C9 15 5 11 5 5C12 5 16 8 16 15ZM16 20C23 20 27 15 27 10C20 10 16 13 16 20Z', 'M10 29H22']);
export const Feather = glyph('soft-theme', ['M6 27L23 9M9 21C6 13 14 2 27 4C28 16 18 26 9 21Z', 'M11 21V16M16 16H21']);
export const Square = glyph('contrast-theme', ['M5 5H27V27H5ZM5 11H11V5M21 27V21H27']);
export const Globe = glyph('all-topics', ['M16 3C23 3 29 9 29 16S23 29 16 29S3 23 3 16S9 3 16 3Z', 'M3 16H29M16 3C8 10 8 22 16 29C24 22 24 10 16 3M6 9H26M6 23H26']);
export const Landmark = glyph('history', ['M3 11L16 4L29 11ZM5 14H27M8 17V25M16 17V25M24 17V25M4 29H28']);
export const Theater = glyph('culture', ['M4 5L18 7V14C18 23 9 26 5 18Z', 'M19 9L29 7L27 23C25 29 18 28 15 23', 'M8 11H10M13 12H15M9 17C11 20 14 19 15 17M21 14H23M21 20L25 20']);
export const ScrollText = glyph('laws', ['M8 8V25C8 30 27 30 27 25V6C27 2 23 2 23 6V8H5C1 8 1 3 5 3H24', 'M13 13H21M13 18H21M13 23H18']);
export const MapPin = glyph('geography', ['M16 29C11 22 5 17 5 12C5 0 27 0 27 12C27 17 21 22 16 29Z', 'M20 12A4 4 0 1 1 12 12A4 4 0 1 1 20 12']);
export const Brain = glyph('memory', ['M7 9H22L27 24H12ZM4 16L7 28H20', 'M13 8C8 2 13 0 16 6C21 0 26 4 20 8M16 8L19 14']);
export const Languages = glyph('languages', ['M3 6H15V20H3ZM17 12H29V27H17Z', 'M6 16L9 9L12 16M7 14H11M21 17H25M23 17V23M21 23H25']);
export const GraduationCap = glyph('learned', ['M3 11L16 4L29 11L16 18ZM8 16V24C13 28 19 28 24 24V16M28 12V25']);
export const MousePointerClick = glyph('try', ['M7 5L23 16L16 18L13 25ZM21 4L22 1M27 8L30 7M23 23L26 26']);
