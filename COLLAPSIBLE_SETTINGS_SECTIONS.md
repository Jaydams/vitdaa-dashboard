# Collapsible Settings Sections - Implementation

## Overview

Enhanced the settings page UX by making expandable sections collapsible to prevent the page from becoming too long when scrolling. This improves navigation and reduces visual clutter.

## Sections Made Collapsible

### 1. **Address Information**

- **State**: `isAddressExpanded`
- **Content**: Street, City, State, Country, Postal Code fields
- **Default**: Collapsed (false)

### 2. **Social Media Links**

- **State**: `isSocialExpanded`
- **Content**: Facebook, Instagram, X (Twitter) URL fields
- **Default**: Collapsed (false)

### 3. **Delivery Locations** (Conditional)

- **State**: `isDeliveryExpanded`
- **Content**: Dynamic list of delivery locations with name, price, and state
- **Default**: Collapsed (false)
- **Visibility**: Only shown when "delivery" dining option is enabled

### 4. **Takeaway Packs**

- **State**: `isTakeawayExpanded`
- **Content**: Default takeaway pack price + dynamic list of custom packaging options
- **Default**: Collapsed (false)

## Implementation Details

### **UI Components Added**

- **Chevron Icons**: `ChevronDown` and `ChevronUp` from Lucide React
- **Toggle Buttons**: Ghost variant buttons in card headers
- **Conditional Rendering**: CardContent wrapped in conditional statements

### **State Management**

```typescript
// Added collapsible section states
const [isDeliveryExpanded, setIsDeliveryExpanded] = useState(false);
const [isTakeawayExpanded, setIsTakeawayExpanded] = useState(false);
const [isAddressExpanded, setIsAddressExpanded] = useState(false);
const [isSocialExpanded, setIsSocialExpanded] = useState(false);
```

### **Header Structure Pattern**

```typescript
<CardHeader className="pb-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">{/* Icon and Title */}</div>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setIsExpanded(!isExpanded)}
      className="h-8 w-8 p-0"
    >
      {isExpanded ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </Button>
  </div>
</CardHeader>;
{
  isExpanded && <CardContent>{/* Section Content */}</CardContent>;
}
```

## Sections Kept Always Visible

### **Core Business Information**

- Business Profile (name, description, business number)
- Branding & Images (profile and cover images)
- Dining Options & Delivery (main configuration)
- Tables Configuration (single field)

### **Reasoning**

These sections contain essential information that users frequently access and modify, so they remain always visible for better accessibility.

## User Experience Benefits

### ✅ **Improved Navigation**

- Shorter page length reduces scrolling
- Users can focus on relevant sections
- Easier to find specific settings

### ✅ **Reduced Visual Clutter**

- Only essential information visible by default
- Optional sections hidden until needed
- Cleaner, more organized appearance

### ✅ **Progressive Disclosure**

- Users can expand only what they need
- Prevents overwhelming new users
- Advanced options available when needed

### ✅ **Maintained Functionality**

- All existing features preserved
- Form validation still works correctly
- Save functionality unaffected

## Technical Implementation

### **Files Modified**

- `SettingsFormClient.tsx`: Added collapsible functionality

### **Dependencies Added**

- `ChevronDown`, `ChevronUp` icons from Lucide React

### **State Variables Added**

- 4 new boolean state variables for section expansion
- No impact on form data or submission logic

## Future Enhancements

### **Potential Improvements**

1. **Remember Expansion State**: Use localStorage to persist user preferences
2. **Expand All/Collapse All**: Add buttons to control all sections at once
3. **Smart Defaults**: Auto-expand sections with validation errors
4. **Animation**: Add smooth expand/collapse transitions
5. **Section Indicators**: Show badges for sections with configured data

### **Accessibility Considerations**

- Consider adding ARIA attributes for screen readers
- Ensure keyboard navigation works properly
- Add focus management for expanded sections

## Testing Checklist

- [ ] All sections expand/collapse correctly
- [ ] Form submission works with collapsed sections
- [ ] Validation errors display properly in collapsed sections
- [ ] Icons change correctly (up/down chevrons)
- [ ] No layout shifts or visual glitches
- [ ] Mobile responsiveness maintained
- [ ] All existing functionality preserved
