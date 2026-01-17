// popup.js
// Branching quiz wizard + local activities.json search (no server)

const homeDiv = document.getElementById("home");
const appDiv = document.getElementById("app");

// Resume file handling
const resumeInput = document.getElementById("resumeInput");
let selectedResumeFile = null;

// Initialize PDF.js and enable resume upload when ready
function initializePDFJS() {
  // Resume upload is ready - no external library needed
  console.log("Resume upload ready");
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePDFJS);
} else {
  initializePDFJS();
}

resumeInput.addEventListener("change", async (e) => {
  selectedResumeFile = e.target.files[0];
  if (selectedResumeFile) {
    homeDiv.classList.add("hidden");
    appDiv.classList.remove("hidden");
    await analyzeResume(selectedResumeFile);
  }
});

document.getElementById("startBtn").addEventListener("click", () => {
  homeDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  renderStep();
});



// -------------------- RESUME KEYWORDS (for tag extraction) --------------------
const RESUME_KEYWORDS = {
  "volunteering": ["volunteered", "volunteering", "volunteer", "community service", "outreach", "philanthrop"],
  "advocacy / civic": ["advocacy", "civic", "campaign", "lobbied", "grassroots", "activist", "advocate"],
  "mentorship": ["mentor", "mentored", "mentoring", "mentorship", "coached", "guided", "advised"],
  "professional-development": ["professional", "certification", "certified", "training", "workshop", "development"],
  "business": ["business", "entrepreneurship", "startup", "management", "finance", "negotiat"],
  "skill-building": ["skill", "build", "technical", "learned", "mastered", "proficient"],
  "STEM": ["STEM", "stem", "engineering", "engineer", "stem", "science", "research", "analytics", "data"],
  "computing": ["computer", "computing", "programming", "coding", "software", "developer", "development", "code", "algorithm"],
  "research": ["learn", "research", "published", "investigation", "study", "project"],
  "design": ["design", "designer", "ui", "ux", "graphic", "visual", "creative"],
  "music": ["music", "musician", "instrument", "band", "orchestra", "singing"],
  "performing-arts": ["art", "perform", "theater", "dance", "drama", "acting", "play"],
  "media / publication": ["media", "public", "publication", "writing", "journalist", "editor", "author"],
  "identity": ["id", "diversity", "identity", "culture", "heritage", "ethnicity", "lgbtq"],
  "gaming": ["gaming", "game", "esports", "competitive", "video game"]
};

// -------------------- RESUME TEXT EXTRACTION --------------------
async function extractTextFromPDF(file) {
  // Simple text extraction from file
  // For PDF files, we do basic text extraction by reading as text
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          // For text files, just use the content directly
          if (file.name.endsWith('.txt')) {
            resolve(event.target.result.toLowerCase());
          } else if (file.name.endsWith('.pdf')) {
            // For PDF, try to extract text by reading as text (limited)
            // This is a fallback that extracts what text can be read directly
            const text = event.target.result;
            const extracted = String.fromCharCode.apply(null, new Uint8Array(text))
              .toLowerCase()
              .replace(/[^\w\s]/g, ' ');
            resolve(extracted);
          } else {
            resolve(event.target.result.toLowerCase());
          }
        } catch (error) {
          reject(new Error("Failed to read file: " + error.message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      
      // Try to read as text first
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        // For PDF and binary, read as text to extract what we can
        reader.readAsText(file, 'latin1');
      }
    });
  } catch (error) {
    console.error("Error extracting text:", error);
    throw error;
  }
}

// -------------------- TAG EXTRACTION FROM RESUME --------------------
function extractTagsFromResume(resumeText) {
  const extractedTags = new Set();
  const tagScores = {};
  
  console.log("Resume text length:", resumeText.length);
  console.log("First 500 chars:", resumeText.substring(0, 500));
  
  for (const [tag, keywords] of Object.entries(RESUME_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      // Use simple substring matching as fallback since PDF extraction might not preserve word boundaries
      const lowerKeyword = keyword.toLowerCase();
      const resumeLower = resumeText.toLowerCase();
      
      // Count occurrences with both regex (for word boundaries) and simple substring matching
      let matches = 0;
      
      // Try word boundary regex first
      try {
        const regex = new RegExp(`\\b${lowerKeyword}\\w*\\b`, 'g');
        const regexMatches = resumeLower.match(regex);
        matches = regexMatches ? regexMatches.length : 0;
      } catch (e) {
        matches = 0;
      }
      
      // If regex didn't find anything, try simple substring matching
      if (matches === 0) {
        const index = resumeLower.indexOf(lowerKeyword);
        if (index !== -1) {
          // Count how many times this substring appears
          let count = 0;
          let pos = 0;
          while ((pos = resumeLower.indexOf(lowerKeyword, pos)) !== -1) {
            count++;
            pos += lowerKeyword.length;
          }
          matches = count;
        }
      }
      
      score += matches;
      if (matches > 0) {
        console.log(`${tag}: found "${keyword}" ${matches} times`);
      }
    }
    if (score > 0) {
      tagScores[tag] = score;
      extractedTags.add(tag);
    }
  }
  
  console.log("Extracted tags:", extractedTags);
  console.log("Tag scores:", tagScores);
  
  // Sort by score and return top tags
  const sortedTags = Object.entries(tagScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([tag]) => tag);
  
  console.log("Final sorted tags:", sortedTags);
  return sortedTags;
}

// -------------------- ANALYZE RESUME --------------------
async function analyzeResume(file) {
  const statusDiv = document.getElementById("status");
  const resultsDiv = document.getElementById("results");
  const quizDiv = document.getElementById("quiz");
  const backBtn = document.getElementById("backBtn");
  const nextBtn = document.getElementById("nextBtn");
  const resetBtn = document.getElementById("resetBtn");

  statusDiv.textContent = "Analyzing resume...";
  quizDiv.innerHTML = "";
  resultsDiv.innerHTML = "";

  try {
    // Extract text from PDF
    const resumeText = await extractTextFromPDF(file);
    
    // Extract tags
    const extractedTags = extractTagsFromResume(resumeText);
    
    if (extractedTags.length === 0) {
      statusDiv.textContent = "No matching tags found in resume. Try the questionnaire instead.";
      backBtn.disabled = false;
      nextBtn.textContent = "Back";
      nextBtn.dataset.mode = "back-home";
      return;
    }
    
    // Set state and search
    appState.userGender = "*"; // Neutral gender
    appState.tags = new Set(extractedTags);
    
    statusDiv.textContent = `Found tags: ${extractedTags.join(", ")}`;
    
    const activities = await loadActivities();
    const matches = searchClubs(activities, extractedTags, appState.userGender);
    
    statusDiv.textContent = `${matches.length} clubs found based on your resume`;
    renderResults(matches, resultsDiv);
    
    backBtn.disabled = false;
    nextBtn.textContent = "Back";
    nextBtn.dataset.mode = "back-home";
    resetBtn.classList.remove("hidden");
  } catch (error) {
    statusDiv.textContent = "Error analyzing resume: " + error.message;
    console.error(error);
    backBtn.disabled = false;
    nextBtn.textContent = "Back";
    nextBtn.dataset.mode = "back-home";
  }
}

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

        // common layout: [name, instagram, description, email, (optional gender)]
        const description =
          typeof club[2] === "string" && club[2].trim() ? club[2] : "(No description)";
        const email =
          typeof club[3] === "string" && club[3].trim() ? club[3] : "";

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

// -------------------- RESULT UI (SHOW/HIDE DESCRIPTION) --------------------
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

// -------------------- GENDER (FOR FILTERING) --------------------
function genderAnswerToBlock(answer) {
  // * -> other, ** -> women, *** -> men
  if (answer === "Male") return "***";
  if (answer === "Female") return "**";
  return "*"; // LGBTQ+ or Prefer not to share
}

// -------------------- LEAF -> TAG MAPPING --------------------
// These are the (#) endpoints you referenced.
// Update these strings to match your activities.json tag columns exactly.
const LEAF_TAGS = {
  // PURPOSE / IMPACT
  "#11": ["volunteering"],
  "#10": ["advocacy / civic"],

  // SKILLS / GROWTH
  "#12": ["STEM", "computing", "research", "mentorship"],
  "#13": ["skill-building", "media / publication", "design"],

  // HOBBIES
  "#5": ["music"],
  "#7": ["performing-arts"],
  "#6": ["gaming"],
  "#9": ["design", "media / publication"],
  "#8": ["culture", "gaming"],

  // IDENTITIES
  "#1": ["identity", "culture"],
  "#3": ["religion / spirituality"],
  "#2": ["identity", "identity-support"],
  "#4": ["identity-support"]
};

// If your JSON doesn't contain some of the above tag strings,
// just delete or change them—search will only return matches for existing tags.

// -------------------- WIZARD STATE --------------------
const appState = {
  userGender: null,
  tags: new Set(),
  // history stack for "Back"
  history: [], // {stepId, selectedValue}
  stepId: "gender_profile"
};

// -------------------- QUIZ STEPS (BRANCHING) --------------------
const STEPS = {
  gender_profile: {
    title: "Profiling: What is your Gender?",
    type: "radio",
    options: [
      { label: "Male", value: "Male", next: "q1" },
      { label: "Female", value: "Female", next: "q1" },
      { label: "LGBTQ+", value: "LGBTQ+", next: "q1" },
      { label: "I don’t want to share", value: "I don’t want to share", next: "q1" }
    ],
    onSelect: (value) => {
      appState.userGender = genderAnswerToBlock(value);
    }
  },

  q1: {
    title: "Which of these sounds best right now?",
    type: "radio",
    options: [
      { label: "Meeting people with similar interest", value: "similar", next: "q_meet_similar" },
      { label: "Something purposeful or growth-focused", value: "purpose", next: "q_purpose_growth" },
      { label: "Not sure", value: "not_sure", next: "q_hobbies" } // per your note: Not sure -> go hobbies-ish
    ]
  },

  // Purpose/growth branch
  q_purpose_growth: {
    title: "What kind of purpose or growth?",
    type: "radio",
    options: [
      { label: "Helping others / social impact", value: "impact", next: "q_meaning_impact" },
      { label: "Learning skills or experience", value: "skills", next: "q_meaning_skills" },
      { label: "Not sure", value: "not_sure", next: "leaf_11" } // Not sure -> volunteering (#11)
    ]
  },

  q_meaning_impact: {
    title: "Which is more meaningful for you?",
    type: "radio",
    options: [
      { label: "Volunteering (#11)", value: "#11", next: "leaf_11" },
      { label: "Social/Civic Advocacy (#10)", value: "#10", next: "leaf_10" }
    ]
  },

  q_meaning_skills: {
    title: "Which is more meaningful for you?",
    type: "radio",
    options: [
      { label: "Academic/technical activity (#12)", value: "#12", next: "leaf_12" },
      { label: "Creative Activities / Productions (#13)", value: "#13", next: "leaf_13" }
    ]
  },

  // Meeting people branch
  q_meet_similar: {
    title: "What types of similarity do you want?",
    type: "radio",
    options: [
      { label: "Identities (nationality, religion, etc)", value: "identities", next: "q_identities" },
      { label: "Hobbies (game, music, etc)", value: "hobbies", next: "q_hobbies" }
    ]
  },

  q_hobbies: {
    title: "Which best describes your hobby among those?",
    type: "radio",
    options: [
      { label: "Music or singing (#5)", value: "#5", next: "leaf_5" },
      { label: "Dance or performing (#7)", value: "#7", next: "leaf_7" },
      { label: "Games (video games, board games) (#6)", value: "#6", next: "leaf_6" },
      { label: "Creating things (art, film, photography, writing) (#9)", value: "#9", next: "leaf_9" },
      { label: "Anime/Cosplay (#8)", value: "#8", next: "leaf_8" }
    ]
  },

  q_identities: {
    title: "Which Identity are you interested in?",
    type: "radio",
    options: [
      { label: "nationality/ethnicity (#1)", value: "#1", next: "leaf_1" },
      { label: "religion (#3)", value: "#3", next: "leaf_3" },
      { label: "gender/sex-related (#2)", value: "#2", next: "leaf_2" },
      { label: "Disability (#4)", value: "#4", next: "leaf_4" }
    ]
  },

  // Leaves (endpoints)
  leaf_11: { leaf: "#11" },
  leaf_10: { leaf: "#10" },
  leaf_12: { leaf: "#12" },
  leaf_13: { leaf: "#13" },
  leaf_5:  { leaf: "#5"  },
  leaf_7:  { leaf: "#7"  },
  leaf_6:  { leaf: "#6"  },
  leaf_9:  { leaf: "#9"  },
  leaf_8:  { leaf: "#8"  },
  leaf_1:  { leaf: "#1"  },
  leaf_3:  { leaf: "#3"  },
  leaf_2:  { leaf: "#2"  },
  leaf_4:  { leaf: "#4"  }
};

// -------------------- QUIZ RENDER (ONE QUESTION AT A TIME) --------------------
function renderStep() {
  const quizDiv = document.getElementById("quiz");
  const statusDiv = document.getElementById("status");
  const resultsDiv = document.getElementById("results");
  const backBtn = document.getElementById("backBtn");
  const nextBtn = document.getElementById("nextBtn");

  statusDiv.textContent = "";
  resultsDiv.innerHTML = "";

  const step = STEPS[appState.stepId];
  quizDiv.innerHTML = "";

  // back button visible only if history exists
  backBtn.disabled = appState.history.length === 0;

  // Leaf: immediately finalize (show results)
  if (step && step.leaf) {
    const leafKey = step.leaf;
    const leafTags = LEAF_TAGS[leafKey] || [];
    leafTags.forEach(t => appState.tags.add(t));

    // show summary + run search
    quizDiv.innerHTML = `
      <div class="q">
        <div class="q-title">Done!</div>
        <div class="small">Selected path: <b>${leafKey}</b></div>
        <div class="small">Tags: <b>${[...appState.tags].join(", ") || "(none)"}</b></div>
      </div>
    `;

    nextBtn.textContent = "Search clubs";
    nextBtn.dataset.mode = "search";
    return;
  }

  nextBtn.textContent = "Next";
  nextBtn.dataset.mode = "next";

  // Render question
  const q = document.createElement("div");
  q.className = "q";

  const title = document.createElement("div");
  title.className = "q-title";
  title.textContent = step.title;
  q.appendChild(title);

  const optionsWrap = document.createElement("div");
  optionsWrap.id = "optionsWrap";

  for (const opt of step.options) {
    const label = document.createElement("label");
    label.className = "opt";
    label.innerHTML = `
      <input type="radio" name="wizard_choice" value="${opt.value}">
      ${opt.label}
    `;
    optionsWrap.appendChild(label);
  }

  q.appendChild(optionsWrap);
  quizDiv.appendChild(q);
}

// -------------------- NAVIGATION --------------------
function getSelectedValue() {
  const el = document.querySelector('input[name="wizard_choice"]:checked');
  return el ? el.value : null;
}

function goNext() {
  const statusDiv = document.getElementById("status");
  const step = STEPS[appState.stepId];
  const selected = getSelectedValue();

  if (!selected) {
    statusDiv.textContent = "Please select an option.";
    return;
  }

  const chosenOpt = step.options.find(o => o.value === selected);
  if (!chosenOpt) {
    statusDiv.textContent = "Invalid selection.";
    return;
  }

  // run side effects
  if (typeof step.onSelect === "function") step.onSelect(selected);

  // record history
  appState.history.push({ stepId: appState.stepId, selectedValue: selected });

  // advance
  appState.stepId = chosenOpt.next;
  renderStep();
}

function goBack() {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = "";

  const prev = appState.history.pop();
  if (!prev) return;

  // Reset tags if user goes back (simple + safe):
  // re-simulate from start using history
  const savedHistory = [...appState.history];
  appState.userGender = null;
  appState.tags = new Set();
  appState.history = [];
  appState.stepId = "gender_profile";

  // replay savedHistory selections
  for (const h of savedHistory) {
    const step = STEPS[appState.stepId];
    if (step && typeof step.onSelect === "function") step.onSelect(h.selectedValue);
    appState.history.push({ stepId: appState.stepId, selectedValue: h.selectedValue });

    const chosenOpt = step.options.find(o => o.value === h.selectedValue);
    appState.stepId = chosenOpt.next;
  }

  // hide reset button
  document.getElementById("resetBtn").classList.add("hidden");

  renderStep();
}

function resetApp() {
  appState.userGender = null;
  appState.tags = new Set();
  appState.history = [];
  appState.stepId = "gender_profile";

  document.getElementById("results").innerHTML = "";
  document.getElementById("status").textContent = "";
  document.getElementById("resetBtn").classList.add("hidden");

  document.getElementById("nextBtn").textContent = "Next";
  document.getElementById("nextBtn").dataset.mode = "next";
  
  // Reset resume input
  const resumeInput = document.getElementById("resumeInput");
  resumeInput.value = "";
  selectedResumeFile = null;

  // go back to homepage
  appDiv.classList.add("hidden");
  homeDiv.classList.remove("hidden");
}


// -------------------- RUN SEARCH AFTER LEAF --------------------
async function runSearch() {
  const statusDiv = document.getElementById("status");
  const resultsDiv = document.getElementById("results");

  if (!appState.userGender) {
    statusDiv.textContent = "Missing gender selection.";
    return;
  }

  const tags = [...appState.tags].filter(Boolean);
  if (tags.length === 0) {
    statusDiv.textContent = "No tags selected. Update LEAF_TAGS mapping.";
    return;
  }

  statusDiv.textContent = `Searching... (tags: ${tags.join(", ")})`;
  const activities = await loadActivities();
  const matches = searchClubs(activities, tags, appState.userGender);

  statusDiv.textContent = `${matches.length} clubs found`;
  renderResults(matches, resultsDiv);
  document.getElementById("resetBtn").classList.remove("hidden");
}

// -------------------- INIT --------------------
// Your popup.html must have these IDs:
// - quiz
// - status
// - results
// - backBtn
// - nextBtn
document.getElementById("backBtn").addEventListener("click", goBack);

document.getElementById("nextBtn").addEventListener("click", async () => {
  const btn = document.getElementById("nextBtn");
  if (btn.dataset.mode === "search") {
    await runSearch();
  } else if (btn.dataset.mode === "back-home") {
    resetApp();
  } else {
    goNext();
  }
});

document.getElementById("resetBtn").addEventListener("click", resetApp);