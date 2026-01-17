from openai import OpenAI
import json
import searching as search

client = OpenAI()

def rank_clubs_with_gpt(clubs, user_profile):
    """
    clubs: list of dicts from search_clubs()
    user_profile: dict describing interests and goals

    returns: clubs sorted by relevance (best first)
    """

    prompt = {
        "user_profile": user_profile,
        "clubs": clubs,
        "task": (
            "Rank the clubs from most relevant to least relevant based on the user profile. "
            "Do not remove clubs. Do not add new clubs. "
            "Return JSON only in the format:\n"
            "[{name, reason}]\n"
        )
    }

    response = client.chat.completions.create(
        model="gpt-4.1-mini",  # fast + cheap, good for ranking
        messages=[
            {"role": "system", "content": "You are a recommendation engine. Be concise and objective."},
            {"role": "user", "content": json.dumps(prompt)}
        ],
        temperature=0.2
    )

    ranked = json.loads(response.choices[0].message.content)

    # Merge ranking back into original club objects
    club_map = {c["name"]: c for c in clubs}
    result = []

    for item in ranked:
        club = club_map.get(item["name"])
        if club:
            club["reason"] = item["reason"]
            result.append(club)

    return result

user_profile = {
    "goals": ["helping others", "social impact"],
    "interests": ["STEM", "technology", "volunteering"],
    "preferred_commitment": "hands-on",
    "experience_level": "high school / early college",
}

activities_data = search.load_activities("activities.json")

filtered = search.search_clubs(
    activities=activities_data,
    tags={"volunteering", "STEM"},
    user_gender="**"
)

ranked = rank_clubs_with_gpt(filtered, user_profile)

for i, club in enumerate(ranked, 1):
    print(f"{i}. {club['name']}")
    print(f"   Why: {club['reason']}")
    print(f"   Contact: {club['email']}")
    print("-" * 40)
