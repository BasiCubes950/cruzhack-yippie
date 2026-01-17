import pandas as pd
import json
from collections import defaultdict

def build_activities_from_sheet(file_path, output_json="activities.json"):
    # Load data
    if file_path.endswith('.csv'):
        # using utf-8-sig to handle BOM if present, otherwise utf-8
        df = pd.read_csv(file_path, encoding='utf-8')
    else:
        df = pd.read_excel(file_path)

    activities_map = defaultdict(list)

    # 1. Config: Gender Mapping
    GENDER_MAP = {
        "women": "**",
        "men": "***",
        "other": "*"
    }

    # 2. Config: Columns to exclude from being treated as Tags
    NON_TAG_COLS = {"Club", "Instagram", "Email", "Original Description"}

    # Dynamically identify tag columns
    tag_columns = [c for c in df.columns if c not in NON_TAG_COLS]

    for _, row in df.iterrows():
        # --- Extract Basic Info ---
        club_name = str(row["Club"]).strip()
        
        # Instagram
        raw_link = row.get("Instagram")
        link = str(raw_link).strip() if pd.notna(raw_link) else ""

        # Description
        raw_desc = row.get("Original Description")
        description = str(raw_desc).strip() if pd.notna(raw_desc) else ""

        # Contact / Email
        raw_email = row.get("Email")
        email = str(raw_email).strip() if pd.notna(raw_email) else ""

        # --- Detect Gender Block ---
        gender_block = None
        for gender_col, symbol in GENDER_MAP.items():
            if gender_col in df.columns:
                val = str(row.get(gender_col)).strip().lower()
                if val == "x":
                    gender_block = symbol
                    break

        # --- Build Tag Lists ---
        for tag in tag_columns:
            # Skip gender columns (they are attributes, not categories)
            if tag in GENDER_MAP:
                continue

            # Check if this club belongs to this tag
            if str(row.get(tag)).strip().lower() == "x":
                
                # Construct the entry
                # Order: [Name, Instagram, Description, Email, (Gender)]
                entry = [club_name, link, description, email]
                
                if gender_block:
                    entry.append(gender_block)

                activities_map[tag].append(entry)

    # Convert to list-of-dicts format
    activities = [{tag: clubs} for tag, clubs in activities_map.items()]

    # Save to JSON
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(activities, f, indent=2, ensure_ascii=False)

    print(f"Processed {len(activities)} categories successfully.")
    return activities

# Usage
activities = build_activities_from_sheet("dirty table.xlsx")