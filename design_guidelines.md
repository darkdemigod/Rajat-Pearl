# Jyotisha Platform Design Guidelines

## Design Approach
**System-Based Design**: Material Design 3 adapted for data-intensive professional tools, with reverent aesthetic honoring Vedic tradition. Emphasis on clarity, hierarchy, and sophisticated data visualization.

## Core Design Principles
1. **Data Clarity First**: Complex calculations and interpretations must be immediately comprehensible
2. **Respectful Elegance**: Honor the sacred nature of Jyotisha with refined, professional presentation
3. **Workflow Efficiency**: Multi-step processes (PDF parsing, rule creation) flow intuitively
4. **Visual Hierarchy**: Critical information (charts, predictions) prominent; supporting data accessible

## Typography
**Font Families**:
- Primary: Inter (UI, data labels, body text)
- Headings: Playfair Display (elegant serif for section headers)
- Monospace: JetBrains Mono (rule code display)

**Scale**:
- Page titles: text-3xl font-semibold
- Section headers: text-xl font-medium
- Data labels: text-sm font-medium uppercase tracking-wide
- Body text: text-base
- Chart annotations: text-xs
- Code blocks: text-sm

## Layout System
**Spacing Units**: Use Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-6
- Section spacing: space-y-8
- Card internal padding: p-4
- Dense data areas: p-2, space-y-2
- Major section gaps: gap-12

**Grid Structure**:
- Dashboard: 12-column responsive grid
- Chart display: 3-column gallery (lg:grid-cols-3 md:grid-cols-2)
- Data tables: full-width with horizontal scroll

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header with subtle shadow
- Logo/title left, main navigation center, user actions right
- Main tabs: Chart Calculator | Rule Library | PDF Toolkit | Learning Module | Interpretations
- Sticky on scroll with backdrop blur

### Dashboard Layout
**Main Sections** (vertical stack):
1. **Birth Details Input Panel** (collapsible card)
   - Horizontal form fields: Name, Date, Time, Location
   - Two-column on desktop, stack on mobile
   - Prominent "Generate Charts" CTA button

2. **Panchanga Display** (prominent card)
   - Grid layout showing: Tithi, Nakshatra, Yoga, Karana, Vaara, Rasi
   - Each item: icon + label + value in structured cells
   - Special lagnas in expandable section

3. **Chart Display Section** (tabbed interface)
   - Tabs: Rasi (D1) | Navamsa (D9) | All Divisional Charts | Chakras
   - Chart visualization: Traditional South/North Indian style diagrams
   - Interactive: hover shows planet details, click for interpretations
   - Gallery view for "All Divisional Charts" (D1-D150 cards)

4. **Interpretation Panel** (split view)
   - Left: Applied rules list with confidence scores
   - Right: AI-generated report with scripture references

### PDF Toolkit Section
**Upload Interface**:
- Large dropzone with visual feedback
- Book metadata form: Title, Author, Chapter selection
- Preview pane showing extracted text with line numbers

**Rule Extraction Interface**:
- Split screen: PDF preview (left) | Extracted rules (right)
- Highlight-to-extract interaction
- Rule categorization: dropdowns for book/chapter/type/varga
- "Add to Library" button per rule with success feedback

### Rule Library
**List View**:
- Filterable data table: columns for Rule Name, Category, Book, Varga Applicability, Confidence
- Search bar with advanced filters dropdown
- Bulk actions: Edit, Delete, Export selected rules

**Detail View** (modal or side panel):
- Rule code display with syntax highlighting
- Metadata tags
- Associated scripture references
- Usage statistics from Learning Module

### Learning Module Dashboard
**Insights Display**:
- Statistics cards: Total charts analyzed, Patterns identified, Rules refined
- Confidence trends graph (line chart over time)
- Recent discoveries list: new yoga patterns, rule inconsistencies
- Pattern visualization: which vargas show strongest correlations

### Chart Components
**Individual Chart Display**:
- Traditional diagram (square or circular based on style)
- Planet positions with degree markers
- Aspect lines (subtle, togglable)
- Legend showing planetary symbols and colors
- Border with chart name (e.g., "Navamsa - D9")

**Chakra Visualization**:
- Circular diagrams with appropriate sectioning
- Animated rotation option for Sudarshana Chakra
- Color-coded sectors with labels

### Data Tables
**Dense Information Display**:
- Zebra striping for row distinction
- Fixed header on scroll
- Sortable columns with arrow indicators
- Expandable rows for detailed information
- Pagination or virtual scroll for large datasets

### Forms & Inputs
**Consistent Style**:
- Outlined inputs with floating labels
- Date/time pickers with calendar popups
- Location autocomplete with map preview
- Validation states: success (green), error (red), warning (amber)
- Helper text below inputs

### Buttons
**Hierarchy**:
- Primary: Solid background, prominent (Generate Charts, Add Rule, Run Interpretation)
- Secondary: Outlined (Filter, Export, Cancel)
- Tertiary: Text-only (Clear, Reset)
- Icon buttons: For actions in tables and cards

### Cards & Panels
**Content Containers**:
- Subtle border, minimal shadow
- Header with title and optional actions
- Body with appropriate padding
- Footer for metadata or actions
- Collapsible sections for dense content

### Modals & Dialogs
**Overlays**:
- Backdrop with blur effect
- Centered modal with max-width constraints
- Clear header with title and close button
- Scrollable content area
- Action buttons in footer (right-aligned)

## Animations
**Minimal, Purposeful**:
- Page transitions: Subtle fade (150ms)
- Chart generation: Loading spinner + progress indicator
- Rule extraction: Highlight animation when adding to library
- Collapsible sections: Smooth height transition (200ms)
- NO decorative animations

## Images
**Strategic Use**:
- Dashboard header: Abstract geometric pattern suggesting cosmic alignment (subtle, low opacity)
- Toolkit section: Traditional manuscript texture background (very subtle)
- NO hero images - this is a professional tool, not marketing site
- Icons: Use Heroicons for UI elements, custom astrological symbols for charts

## Responsive Behavior
**Breakpoints**:
- Mobile (< 768px): Single column, stacked charts, drawer navigation
- Tablet (768px - 1024px): 2-column charts, visible navigation
- Desktop (> 1024px): Full multi-column layout, side-by-side panels

**Mobile Adaptations**:
- Collapsible input panel (initially collapsed)
- Tabbed chart view (one at a time)
- Bottom sheet for rule details
- Hamburger menu for main navigation

## Special Considerations
**Accessibility**:
- ARIA labels for all chart elements
- Keyboard navigation for all interactive elements
- High contrast mode support for data tables
- Screen reader descriptions for visual charts

**Cultural Sensitivity**:
- Respectful presentation of Sanskrit terms
- Option to display terminology in multiple scripts (Devanagari, IAST)
- Reverent handling of sacred texts in PDF toolkit

This design creates a sophisticated, data-rich professional tool that balances modern UX patterns with the traditional gravitas of Vedic Astrology practice.