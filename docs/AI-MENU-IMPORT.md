# AI Menu Import Pipeline

## Overview
The AI Menu Import system enables restaurants to convert physical menu photographs into a structured, digital menu in under 60 seconds, with **zero external API dependencies** and **zero paid cloud services**.

---

## Processing Pipeline

```
[ Menu Image Upload ]
         │
         ▼
[ MIME & Size Sanitization ]
         │
         ▼
[ Local MinIO S3 Storage ]
         │
         ▼
[ Tesseract.js WASM OCR Engine ]
         │ (Extracts bounding boxes & text strings)
         ▼
[ Heuristic Layout & Menu Parser ]
         │ (Categorization, prices, food types, confidence)
         ▼
[ Human Review UI (Confidence Threshold Scoring) ]
         │ (Owner/Staff accepts, corrects, or rejects uncertain items)
         ▼
[ Publish to Live Menu ]
```

---

## Critical Rules & Confidence Scoring
1. **Never Invent Prices**:
   - If an item's price cannot be detected with >60% confidence, `price.requiresReview = true` is set.
   - Items with uncertain prices cannot be automatically published without human verification.
2. **Confidence Metric**:
   - `itemName.confidence`: Evaluates character set, length, capitalization, and punctuation.
   - `price.confidence`: Evaluates standard INR formats (`₹150`, `Rs. 150`, `150/-`, `150.00`).
   - `overallConfidence`: Geometric mean of name and price confidence.
3. **Food Type Heuristics**:
   - Classifies items into `VEG` or `NON_VEG` based on protein/ingredient keywords (`chicken`, `paneer`, `mutton`, `dal`, `fish`, `egg`).

---

## Human-in-the-Loop Review
The restaurant manager can:
- Inspect detected bounding items side-by-side with original photos.
- Filter by items marked `requires_review = true`.
- Edit names, categories, or prices directly inline.
- Click **Publish All Approved** to create active `MenuItem` and `MenuCategory` records in PostgreSQL.
