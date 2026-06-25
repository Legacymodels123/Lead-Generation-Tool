# First Live Vertical Slice

## Objective

Ship the smallest complete experience that already feels like the new product.

## Scope

1. Open `/workspace`
2. Import Excel/CSV rows
3. Detect incoming columns
4. Auto-create missing properties
5. Infer property types with heuristics plus AI support
6. Edit row values inline
7. Run Claude on selected AI properties
8. Save values to Supabase
9. Inspect the selected row in the side panel

## Required behaviors

### Import
- accept CSV first, Excel shortly after
- read header names
- create new properties from headers automatically
- infer likely property types:
  - URL
  - dropdown
  - text
  - number
  - date

### Board
- rows are companies
- columns are dynamic properties
- edits are inline and immediate
- save state is visible but quiet

### AI property enrichment
- user can mark a property as `ai_enriched`
- user can select one or many rows
- Claude fills the selected AI property
- enrichment result is stored and visible in the row + side panel

## Definition of done

- import works on real sample data
- imported columns become usable properties
- manual edits persist
- AI property runs complete
- selected row details are inspectable
- no rigid preset schema is required for success
