# Magic Mode API Contract

## Endpoint Options

## 1. BYO Key (Client Direct)
`POST https://api.openai.com/v1/responses`

Headers:
- `Authorization: Bearer <OPENAI_API_KEY>`
- `Content-Type: application/json`

Body shape:
- `model`: default `gpt-5.2`
- `input`: system + user messages
- user message contains:
  - `input_text`
  - `input_image` (`data:image/jpeg;base64,...`)
- `text.format`: strict `json_schema`

## 2. Proxy Mode
`POST /api/vision-parse`

Request:
```json
{
  "imageBase64": "...",
  "mimeType": "image/jpeg"
}
```

Response (strict):
```json
{
  "list_title": "Saag paneer and fruit run",
  "items": [
    {
      "raw_text": "2 miik",
      "canonical_name": "milk",
      "quantity": "2",
      "notes": null,
      "category_hint": "dairy_eggs",
      "major_section": "perimeter_refrigerated_wall",
      "subsection": "Milk and alt milks",
      "within_section_order": 1
    }
  ],
  "warnings": []
}
```

## JSON Schema Name
`shopping_list_extraction_v3`

All fields are required, `additionalProperties` is false.

Per-item fields:
- `list_title` (short shopping-run name)
- `raw_text`
- `canonical_name`
- `quantity`
- `notes`
- `category_hint` (legacy coarse category)
- `major_section` (scaffold major header ID)
- `subsection` (scaffold subsection label when applicable)
- `within_section_order` (1-based ordering within `major_section`)
