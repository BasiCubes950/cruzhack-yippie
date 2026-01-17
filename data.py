import pandas as pd
import json
from collections import defaultdict

def build_activities_from_sheet(file_path, output_json="activities.json"):
    df = pd.read_excel(file_path)

    activities_map = defaultdict(list)

    GENDER_MAP = {
        "women": "**",
        "men": "***",
        "other": "*"
    }

    # columns that are NOT tags
    NON_TAG_COLS = {"Club name", "Instagram", "Email", "Unnamed: 3"}

    tag_columns = [c for c in df.columns if c not in NON_TAG_COLS]

    for _, row in df.iterrows():
        club_name = row["Club name"]
        link = row["Instagram"]

        # detect gender block (optional)
        gender_block = None
        for gender_col, symbol in GENDER_MAP.items():
            if gender_col in df.columns and str(row.get(gender_col)).lower() == "x":
                gender_block = symbol
                break

        # assign club to tags
        for tag in tag_columns:
            if tag in GENDER_MAP:
                continue  # skip gender-only tags

            if str(row.get(tag)).lower() == "x":
                if gender_block:
                    activities_map[tag].append([club_name, link, gender_block])
                else:
                    activities_map[tag].append([club_name, link])

    # convert to list-of-dicts format
    activities = [{tag: clubs} for tag, clubs in activities_map.items()]

    # save to json
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(activities, f, indent=2)

    return activities


# usage
activities = build_activities_from_sheet("dirty table.xlsx")
