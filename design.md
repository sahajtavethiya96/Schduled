# Schduled — Design System

## Core Principles

- **Sharp corners everywhere.** `border-radius` is `0` for all elements — buttons, inputs, cards, dialogs, badges. Never add rounded corners.
- **Teal-only brand.** All interactive, accent, and primary elements use the teal color token (`--primary`). No other brand color is introduced.
- **Consistent spacing.** Use Tailwind spacing scale. Prefer `gap-*` over manual margins.

## Color Tokens

All colors are defined as `oklch()` values in `app/globals.css`.

| Token | Purpose |
|---|---|
| `primary` | Teal — buttons, links, active states, icons |
| `primary-foreground` | Text/icons on teal backgrounds |
| `secondary` | Teal-tinted light surface |
| `muted` | Subtle teal wash for backgrounds |
| `accent` | Rich teal hover state |
| `destructive` | Red — errors, delete actions |
| `sidebar` | Deep ocean blue-teal sidebar background |
| `sidebar-primary` | Active sidebar item background |
| `sidebar-primary-foreground` | Text/icon on active sidebar item |

## Typography

| Token | Font |
|---|---|
| `--font-sans` | Geist Sans (body text) |
| `--font-heading` | Plus Jakarta Sans (headings) |
| `--font-mono` | Geist Mono (code) |

## Icons

**Use Phosphor Icons only.** Import from `@phosphor-icons/react`.

```tsx
import { CalendarBlank, Clock, CheckCircle } from '@phosphor-icons/react'
```

Never use Lucide, Heroicons, or any other icon library.

## Component Library

**Always use the UI Kit components** from `components/ui/`. Never use raw HTML elements where a UI Kit component exists.

Available components:

| Component | Use for |
|---|---|
| `Button` | All clickable buttons |
| `Input` | Single-line text inputs |
| `Textarea` | Multi-line text inputs |
| `Label` | Form labels |
| `Select / SelectTrigger / SelectContent / SelectItem` | Dropdowns |
| `Checkbox` | Checkbox inputs |
| `Switch` | Toggle switches |
| `RadioGroup / RadioGroupItem` | Radio inputs |
| `Dialog / DialogContent` | Modal dialogs |
| `Sheet / SheetContent` | Slide-over panels |
| `AlertDialog` | Destructive confirmation dialogs |
| `Card / CardHeader / CardContent / CardFooter` | Content cards |
| `Tabs / TabsList / TabsTrigger / TabsContent` | Tab navigation |
| `Accordion / AccordionItem / AccordionTrigger / AccordionContent` | Collapsible sections |
| `Badge` | Status tags and labels |
| `Separator` | Visual dividers |
| `Skeleton` | Loading placeholders |
| `Tooltip / TooltipTrigger / TooltipContent` | Hover tooltips |
| `Popover / PopoverTrigger / PopoverContent` | Floating panels |
| `DropdownMenu` | Context and action menus |
| `Table / TableHeader / TableBody / TableRow / TableCell` | Data tables |
| `Form / FormField / FormItem / FormLabel / FormControl / FormMessage` | Validated forms |
| `Spinner` | Loading indicators |
| `Avatar / AvatarImage / AvatarFallback` | User avatars |
| `Alert` | Inline alert messages |
| `Progress` | Progress bars |
| `Slider` | Range sliders |
| `ScrollArea` | Scrollable containers |
| `Pagination` | Page navigation |
| `Breadcrumb` | Navigation breadcrumbs |
| `DataTable` | Sortable/filterable data tables |
| `Empty` | Empty state illustrations |
| `Stat` | Metric/statistic display |
| `Kbd` | Keyboard shortcut display |

Create a new component only when none of the above fit the use case.

## URL / Route Naming

- All route segments must be **lowercase**
- Use **hyphens (`-`)** as word separators
- No spaces, no underscores, no uppercase
- Landing page lives at `/` (root), not `/landing-page`

Examples:
- ✓ `/event-types`, `/my-link`, `/booking/review`
- ✗ `/EventTypes`, `/my_link`, `/Booking-Review`
