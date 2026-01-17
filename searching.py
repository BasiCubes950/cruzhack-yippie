import json

def load_activities(json_file="activities.json"):
    with open(json_file, "r", encoding="utf-8") as f:
        return json.load(f)

def search_clubs(activities, tags, user_gender):
    """
    activities: list of dicts loaded from activities.json
    tags: iterable of tags to search (e.g., {"volunteering", "STEM"})
    user_gender: "***" (men), "**" (women), or "*" (other)

    returns: list of dictionaries for better readability
    """
    results = []
    seen = set()

    for activity_dict in activities:
        for tag in tags:
            # Check if this category exists in the current dictionary
            if tag not in activity_dict:
                continue

            for club in activity_dict[tag]:
                # Mapping based on the new list structure:
                # [0]: Name, [1]: Instagram, [2]: Description, [3]: Email, [4]: Gender
                name = club[0]
                instagram = club[1]
                description = club[2]
                email = club[3]
                
                # Check for gender block (it will be at index 4 if it exists)
                # If club has a gender requirement and it doesn't match the user, skip.
                if len(club) > 4 and club[4] != user_gender:
                    continue

                # Use name as the unique key to avoid duplicates across multiple tags
                if name not in seen:
                    seen.add(name)
                    results.append({
                        "name": name,
                        "instagram": instagram,
                        "description": description,
                        "email": email
                    })

    return results

# --- Example Usage ---

# Mapping Reference:
# * -> other
# ** -> women
# *** -> men

user_gender = "**"
search_tags = {"volunteering", "STEM"}

activities_data = load_activities("activities.json")
matches = search_clubs(activities_data, search_tags, user_gender)

print(f"Found {len(matches)} matches:\n")
for club in matches:
    print(f"Club: {club['name']}")
    print(f"Contact: {club['email']} | {club['instagram']}")
    print(f"Description: {club['description']}") # Print first 100 chars
    print("-" * 30)