// popup.js

// -------------------- DATA LOAD --------------------
async function loadActivities() {
  const url = chrome.runtime.getURL("activities.json");
  const response = await fetch(url);
  return await response.json();
}

// -------------------- SEARCH --------------------
function searchClubs(activities, tags, userGender) {
  const results = [];
  const seen = new Set();
  const GENDER_BLOCKS = new Set(["*", "**", "***"]);

  for (const activity of activities) {
    for (const tag of tags) {
      if (!(tag in activity)) continue;

      for (const club of activity[tag]) {
        const name = club[0];
        const contact = club[1];

        // gender filtering ONLY if a gender block exists
        const lastField = club[club.length - 1];
        if (GENDER_BLOCKS.has(lastField) && lastField !== userGender) continue;

        // Common layout: [name, instagram, description, email, (optional gender)]
        const description =
          typeof club[2] === "string" && club[2].trim()
            ? club[2]
            : "(No description)";
        const email =
          typeof club[3] === "string" && club[3].trim()
            ? club[3]
            : "";

        const key = `${name}|${contact}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ name, contact, email, description });
        }
      }
    }
  }

  return results;
}

// -------------------- QUIZ CONFIG (EXTENDABLE) --------------------

// Gender mapping to your blocks:
// * -> other, ** -> women, *** -> men
function genderAnswerToBlock(answer) {
  if (answer === "Male") return "***";
  if (answer === "Female") return "**";
  // LGBTQ+ or "I don’t want to share" -> treat as "other"
  return "*";
}

/**
 * Interest question system:
 * - Add new questions by pushing into INTEREST_QUESTIONS.
 * - Each option can map to one or more tags.
 */
const INTEREST_QUESTIONS = [
  {
    id: "goal",
    type: "checkbox",
    prompt:
      "What are you hoping to get out of joining a student organization? (Select all that apply)",
    options: [
      { label: "Social connection and community", tags: ["community"] },
      { label: "Volunteering or making an impact", tags: ["volunteering"] },
      {
        label: "Personal growth or skill development",
        tags: ["skill-building", "professional-development"],
      },
    ],
  },
];

// -------------------- CONDITIONAL QUESTIONS --------------------
const SOCIAL_FOLLOWUPS = {
  greekLifeTag: "greek-life",
  hobbies: [
    { label: "Music", tags: ["music"] },
    { label: "Gaming (including boardgames like chess)", tags: ["gaming", "boardgame"] },
    { label: "Performing Arts", tags: ["performing-arts"] },
    { label: "Sports", tags: ["sports"] },
    { label: "Arts (non-performing)", tags: ["design", "art"] },
  ],
};

// -------------------- QUIZ RENDER --------------------
function renderQuiz(container) {
  container.innerHTML = "";

  // Profiling: Gender (radio)
  const genderQ = document.createElement("div");
  genderQ.className = "q";
  genderQ.innerHTML = `
    <div class="q-title">Profiling: What is your Gender?</div>
    <label class="opt"><input type="radio" name="gender" value="Male"> Male</label>
    <label class="opt"><input type="radio" name="gender" value="Female"> Female</label>
    <label class="opt"><input type="radio" name="gender" value="LGBTQ+"> LGBTQ+</label>
    <label class="opt"><input type="radio" name="gender" value="I don’t want to share"> I don’t want to share</label>
  `;
  container.appendChild(genderQ);

  // Conditional follow-up: LGBTQ+ clubs interest (hidden unless needed)
  const lgbtqFollowUp = document.createElement("div");
  lgbtqFollowUp.className = "q hidden";
  lgbtqFollowUp.id = "lgbtqFollowUp";
  lgbtqFollowUp.innerHTML = `
    <div class="q-title">If you selected LGBTQ+ or “I don’t want to share”… Are you interested in LGBTQ+ clubs?</div>
    <label class="opt"><input type="radio" name="want_lgbtq" value="Yes"> Yes</label>
    <label class="opt"><input type="radio" name="want_lgbtq" value="No"> No</label>
  `;
  container.appendChild(lgbtqFollowUp);

  // Render interest questions from config
  for (const q of INTEREST_QUESTIONS) {
    const qDiv = document.createElement("div");
    qDiv.className = "q";
    qDiv.dataset.qid = q.id;

    const title = document.createElement("div");
    title.className = "q-title";
    title.textContent = q.prompt;
    qDiv.appendChild(title);

    if (q.type === "checkbox") {
      for (const opt of q.options) {
        const label = document.createElement("label");
        label.className = "opt";
        label.innerHTML = `<input type="checkbox" name="${q.id}" value="${opt.label}"> ${opt.label}`;
        qDiv.appendChild(label);
      }
    } else if (q.type === "radio") {
      for (const opt of q.options) {
        const label = document.createElement("label");
        label.className = "opt";
        label.innerHTML = `<input type="radio" name="${q.id}" value="${opt.label}"> ${opt.label}`;
        qDiv.appendChild(label);
      }
    }

    container.appendChild(qDiv);
  }

  // Social connection follow-ups (hidden unless Social connection chosen)
  const socialFollowups = document.createElement("div");
  socialFollowups.className = "q hidden";
  socialFollowups.id = "socialFollowups";
  socialFollowups.innerHTML = `
    <div class="q-title">If you selected “Social connection and community”…</div>

    <div class="q-title" style="margin-top:6px;">Are you interested in Greek-Life clubs (like Alpha Epsilon Pi)?</div>
    <label class="opt"><input type="radio" name="greek_life" value="Yes"> Yes</label>
    <label class="opt"><input type="radio" name="greek_life" value="No"> No</label>

    <div class="q-title" style="margin-top:10px;">What are your hobbies? (Select all that apply)</div>
    ${SOCIAL_FOLLOWUPS.hobbies
      .map(
        (h) => `<label class="opt"><input type="checkbox" name="hobby" value="${h.label}"> ${h.label}</label>`
      )
      .join("")}
  `;
  container.appendChild(socialFollowups);

  // Show/hide follow-ups based on answers
  container.addEventListener("change", (e) => {
    // LGBTQ follow-up toggling
    if (e.target && e.target.name === "gender") {
      const v = e.target.value;
      const show = v === "LGBTQ+" || v === "I don’t want to share";
      lgbtqFollowUp.classList.toggle("hidden", !show);

      if (!show) {
        container.querySelectorAll('input[name="want_lgbtq"]').forEach((el) => (el.checked = false));
      }
    }

    // Social follow-ups toggling
    const socialSelected = [...container.querySelectorAll('input[name="goal"]:checked')]
      .some((el) => el.value === "Social connection and community");

    socialFollowups.classList.toggle("hidden", !socialSelected);

    if (!socialSelected) {
      container.querySelectorAll('input[name="greek_life"]').forEach((el) => (el.checked = false));
      container.querySelectorAll('input[name="hobby"]').forEach((el) => (el.checked = false));
    }
  });
}

// -------------------- QUIZ READ -> (userGender, tags) --------------------
function readQuizAnswers(root) {
  const tags = new Set();

  // gender
  const genderEl = root.querySelector('input[name="gender"]:checked');
  const genderAnswer = genderEl ? genderEl.value : null;
  const userGender = genderAnswer ? genderAnswerToBlock(genderAnswer) : null;

  // conditional lgbtq interest
  const wantLgbtqEl = root.querySelector('input[name="want_lgbtq"]:checked');
  const wantLgbtq = wantLgbtqEl ? wantLgbtqEl.value : null;

  // interest selections -> tags
  for (const q of INTEREST_QUESTIONS) {
    if (q.type === "checkbox") {
      const checked = [...root.querySelectorAll(`input[name="${q.id}"]:checked`)]
        .map((el) => el.value);

      for (const label of checked) {
        const opt = q.options.find((o) => o.label === label);
        if (opt && opt.tags) opt.tags.forEach((t) => tags.add(t));
      }
    } else if (q.type === "radio") {
      const chosen = root.querySelector(`input[name="${q.id}"]:checked`);
      if (chosen) {
        const opt = q.options.find((o) => o.label === chosen.value);
        if (opt && opt.tags) opt.tags.forEach((t) => tags.add(t));
      }
    }
  }

  // LGBTQ tag (update "identity" if that's the tag you want instead)
  if ((genderAnswer === "LGBTQ+" || genderAnswer === "I don’t want to share") && wantLgbtq === "Yes") {
    tags.add("identity");
  }

  // Social follow-ups
  const socialSelected = [...root.querySelectorAll('input[name="goal"]:checked')]
    .some((el) => el.value === "Social connection and community");

  if (socialSelected) {
    // Greek life
    const greek = root.querySelector('input[name="greek_life"]:checked');
    if (greek && greek.value === "Yes") tags.add(SOCIAL_FOLLOWUPS.greekLifeTag);

    // Hobbies
    const hobbyChecks = [...root.querySelectorAll('input[name="hobby"]:checked')]
      .map((el) => el.value);

    for (const h of hobbyChecks) {
      const hobby = SOCIAL_FOLLOWUPS.hobbies.find((x) => x.label === h);
      if (hobby) hobby.tags.forEach((t) => tags.add(t));
    }
  }

  return { userGender, tags: [...tags], genderAnswer };
}

// -------------------- RENDER RESULTS (SHOW/HIDE DESCRIPTION) --------------------
function renderResults(matches, resultsDiv) {
  resultsDiv.innerHTML = "";

  if (matches.length === 0) {
    resultsDiv.innerHTML = `<div class="small">No clubs found for those tags.</div>`;
    return;
  }

  for (const club of matches) {
    const wrapper = document.createElement("div");
    wrapper.className = "club";

    const header = document.createElement("div");
    header.innerHTML = `
      <b>${club.name}</b><br/>
      <span class="small">${club.contact}${club.email ? " • " + club.email : ""}</span>
    `;

    const btnRow = document.createElement("div");
    btnRow.className = "toggleRow";

    const showBtn = document.createElement("button");
    showBtn.textContent = "Show description";

    const hideBtn = document.createElement("button");
    hideBtn.textContent = "Hide description";
    hideBtn.disabled = true;

    const descBox = document.createElement("div");
    descBox.className = "desc hidden";
    descBox.textContent = club.description;

    showBtn.addEventListener("click", () => {
      descBox.classList.remove("hidden");
      showBtn.disabled = true;
      hideBtn.disabled = false;
    });

    hideBtn.addEventListener("click", () => {
      descBox.classList.add("hidden");
      showBtn.disabled = false;
      hideBtn.disabled = true;
    });

    btnRow.appendChild(showBtn);
    btnRow.appendChild(hideBtn);

    wrapper.appendChild(header);
    wrapper.appendChild(btnRow);
    wrapper.appendChild(descBox);

    resultsDiv.appendChild(wrapper);
  }
}

// -------------------- INIT + SUBMIT --------------------
const quizDiv = document.getElementById("quiz");
const submitBtn = document.getElementById("submitBtn");
const statusDiv = document.getElementById("status");
const resultsDiv = document.getElementById("results");

renderQuiz(quizDiv);

submitBtn.addEventListener("click", async () => {
  statusDiv.textContent = "";
  resultsDiv.innerHTML = "";

  const { userGender, tags, genderAnswer } = readQuizAnswers(quizDiv);

  if (!genderAnswer) {
    statusDiv.textContent = "Please select your gender to continue.";
    return;
  }
  if (tags.length === 0) {
    statusDiv.textContent = "Please select at least one interest option.";
    return;
  }

  statusDiv.textContent = `Searching... (tags: ${tags.join(", ")})`;

  const activities = await loadActivities();
  const matches = searchClubs(activities, tags, userGender);

  statusDiv.textContent = `${matches.length} clubs found`;
  renderResults(matches, resultsDiv);
});
