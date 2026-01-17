import json

def load_activities(json_file="activities.json"):
    with open(json_file, "r", encoding="utf-8") as f:
        return json.load(f)


def search_clubs(activities, tags, user_gender):
    """
    activities: list of dicts loaded from activities.json
    tags: iterable of tags to search
    user_gender: "***", "**", or "*"

    returns: list of (name, contact, link)
    """

    results = []
    seen = set()

    for activity in activities:
        for tag in tags:
            if tag not in activity:
                continue

            for club in activity[tag]:
                club_name = club[0]
                contact = club[1]   # Instagram
                link = club[1]

                # gender check ONLY if block exists
                if len(club) >= 3 and club[2] != user_gender:
                    continue

                key = (club_name, contact)
                if key not in seen:
                    seen.add(key)
                    results.append((club_name, contact, link))

    return results

"""
* -> other
** -> women
*** ->  men
"""

user_gender = "**"
tags = {"volunteering", "community"}

activities = load_activities("activities.json")
matches = search_clubs(activities, tags, user_gender)

for name, contact, link in matches:
    print(name, contact, link)
