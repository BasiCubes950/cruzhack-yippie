from data import activities

hobby_activities = []

# user
user_gender = "***"  # example

for activity in activities:
    if "running" in activity:
        hobby_activities.extend(activity["running"])

for e in hobby_activities:
    club_name = e[0]
    link = e[1]

    # check gender only if block exists
    if len(e) >= 3:
        club_gender = e[2]
        if club_gender != user_gender:
            continue  # skip if gender doesn't match

    print(f"{club_name} here is the link: {link}")
