def run_profile_quiz():
    profile = {}

    # --- Basic profiling ---
    print("Basic Profiling\n")

    profile["grade"] = input("Grade (9 / 10 / 11 / 12): ").strip()

    profile["gender"] = input(
        "Gender (Male / Female / Non-binary / Prefer not to say): "
    ).strip()

    profile["ethnicity"] = input(
        "Ethnicity (Optional / Prefer not to say): "
    ).strip()

    # --- Interest sorting (1–5 scale) ---
    print("\nInterest Sorting (1 = Not at all, 5 = Very much)\n")

    def scale_question(prompt):
        while True:
            try:
                value = int(input(prompt + " (1–5): "))
                if 1 <= value <= 5:
                    return value
            except ValueError:
                pass
            print("Please enter a number from 1 to 5.")

    interests = {}
    interests["programming"] = scale_question(
        "How much do you enjoy programming?"
    )
    interests["robotics"] = scale_question(
        "How interested are you in robotics / hardware?"
    )
    interests["ai"] = scale_question(
        "How interested are you in AI / data / algorithms?"
    )
    interests["problem_solving"] = scale_question(
        "How much do you enjoy problem-solving challenges?"
    )

    profile["interests"] = interests

    return profile

user_profile = run_profile_quiz()
print("\nStored profile:")
print(user_profile)