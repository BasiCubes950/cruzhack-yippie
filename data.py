import pandas as pd
import json
from collections import defaultdict

def build_activities_from_sheet(file_path, output_json="activities.json"):
    # Load data (handles both CSV and Excel based on extension)
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    activities_map = defaultdict(list)

    # 1. Config: Gender Mapping
    # The data provided only has "women", but we keep the structure generic
    GENDER_MAP = {
        "women": "**",
        "men": "***",
        "other": "*"
    }

    # 2. Config: Columns that should NOT be treated as activity tags
    # Updated 'Club name' -> 'Club' based on your CSV header
    NON_TAG_COLS = {"Club", "Instagram", "Email"}

    # Dynamically determine which columns are tags
    tag_columns = [c for c in df.columns if c not in NON_TAG_COLS]

    for _, row in df.iterrows():
        # Get basic info
        club_name = row["Club"]
        
        # Handle Instagram: Check for NaN (empty cells) and convert to string
        raw_link = row.get("Instagram")
        link = str(raw_link) if pd.notna(raw_link) else ""

        # 3. Logic: Detect gender block
        gender_block = None
        for gender_col, symbol in GENDER_MAP.items():
            # Check if column exists in this sheet and mark is 'X'
            if gender_col in df.columns:
                cell_value = str(row.get(gender_col)).strip().lower()
                if cell_value == "x":
                    gender_block = symbol
                    break

        # 4. Logic: Assign club to tags
        for tag in tag_columns:
            # Skip gender columns (they are attributes, not categories)
            if tag in GENDER_MAP:
                continue

            # Check if club has 'X' for this tag (using strip() to clean dirty inputs)
            if str(row.get(tag)).strip().lower() == "x":
                
                # Construct the entry: [Name, Link, (Optional Gender)]
                entry = [club_name, link]
                
                if gender_block:
                    entry.append(gender_block)

                activities_map[tag].append(entry)

    # Convert to list-of-dicts format
    activities = [{tag: clubs} for tag, clubs in activities_map.items()]

    # Save to json
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(activities, f, indent=2)

    return activities

# Usage Example:
activities = build_activities_from_sheet("dirty table.xlsx")