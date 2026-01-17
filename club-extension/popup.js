async function loadActivities() {
  const url = chrome.runtime.getURL("activities.json");
  const response = await fetch(url);
  return await response.json();
}

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

        // description + email are present in your JSON (see example rows)
        // common layout: [name, instagram, description, email] OR [..., genderBlock]
        // We'll grab description as the 3rd item if it looks like a sentence.
        const description = club[2] && typeof club[2] === "string" ? club[2] : "(No description)";
        const email = club[3] && typeof club[3] === "string" ? club[3] : "";

        const key = `${name}|${contact}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ name, contact, description, email });
        }
      }
    }
  }

  return results;
}

document.getElementById("searchBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";
  status.textContent = "Searching...";

  const userGender = document.getElementById("gender").value;
  const tags = document.getElementById("tags").value
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);

  const activities = await loadActivities();
  const matches = searchClubs(activities, tags, userGender);

  status.textContent = `${matches.length} clubs found`;

  for (const club of matches) {
    const wrapper = document.createElement("div");
    wrapper.className = "club";

    // Header info
    const header = document.createElement("div");
    header.innerHTML = `
      <b>${club.name}</b><br/>
      <span class="small">${club.contact}${club.email ? " • " + club.email : ""}</span>
    `;

    // Description box (hidden by default)
    const descBox = document.createElement("div");
    descBox.className = "desc hidden";
    descBox.textContent = club.description;

    // Buttons row
    const btnRow = document.createElement("div");
    btnRow.className = "toggleRow";

    const showBtn = document.createElement("button");
    showBtn.textContent = "Show description";

    const hideBtn = document.createElement("button");
    hideBtn.textContent = "Hide description";
    hideBtn.disabled = true;

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
});
