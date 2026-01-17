from data import activities

# user
user_gender = "***"      # "***", "**", or "*"
# target_tag = "running"  # change this dynamically

hobby_activities = []

# collect clubs under the target tag
target_tags = {"running", "boardgame"}

for activity in activities:
    for tag in target_tags:
        if tag in activity:
            hobby_activities.extend(activity[tag])


"""for activity in activities:
    if target_tag in activity:
        hobby_activities.extend(activity[target_tag])"""

# filter + print
for e in hobby_activities:
    club_name = e[0]
    link = e[1]

    # gender check ONLY if block exists
    if len(e) >= 3 and e[2] != user_gender:
        continue

    print(f"{club_name} here is the link: {link}")
