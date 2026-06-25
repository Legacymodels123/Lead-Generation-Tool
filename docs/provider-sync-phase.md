# Provider And Sync Phase

## Objective

Add the external capability layer after the core workspace slice is stable.

## Provider order

### 1. Claude
- primary AI provider
- property enrichment
- property inference support during import
- qualification reasoning

### 2. Hunter
- email discovery
- domain-based contact enrichment
- verification support

### 3. Lusha
- B2B contact enrichment
- company and contact property fill
- alternate provider for missing values

### 4. HubSpot
- full two-way sync
- property mapping
- inbound/outbound updates
- conflict tracking

## Two-way HubSpot sync requirements

- map workspace properties to HubSpot properties
- sync selected company properties outward
- pull updated values from HubSpot inward
- show sync status per row/property
- keep conflict history instead of silently overwriting values

## Sync phases

### Phase A
- connect HubSpot
- read company properties
- map workspace property definitions

### Phase B
- push workspace values to HubSpot
- write outbound sync events

### Phase C
- pull remote property changes from HubSpot
- detect conflicts
- show merge status in the workspace

## Provider UX rules

- provider setup must explain what capability it unlocks
- missing providers must degrade gracefully
- provider status must be visible in setup and in relevant actions
- no provider should feel like a separate product area
