async function loadActivities() {
  const response = await fetch("activities.json");
  return await response.json();
}

function searchClubs(activities, tags, userGender) {
  const results = [];
  const seen = new Set();

  for (const activity of activities) {
    for (const tag of tags) {
      if (!(tag in activity)) continue;

      for (const club of activity[tag]) {
        const name = club[0];
        const contact = club[1];
        const link = club[1];

        // gender check ONLY if block exists
        if (club.length >= 3 && club[2] !== userGender) continue;

        const key = `${name}|${contact}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push([name, contact, link]);
        }
      }
    }
  }

  return results;
}

document.getElementById("searchBtn").addEventListener("click", async () => {
  const userGender = "**"; // women
  const tags = new Set(["volunteering"]);

  const activities = await loadActivities();
  const matches = searchClubs(activities, tags, userGender);

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  resultsDiv.innerHTML += `<strong>${matches.length} clubs found</strong>`;

  for (const [name, contact, link] of matches) {
    resultsDiv.innerHTML += `
      <div class="club">
        <b>${name}</b><br>
        ${contact}
      </div>
    `;
  }
});
