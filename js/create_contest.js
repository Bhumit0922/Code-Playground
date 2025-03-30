document.addEventListener("DOMContentLoaded", function () {
  // Tab switching
  document.querySelectorAll(".problem-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      document
        .querySelectorAll(".problem-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".problem-content")
        .forEach((c) => c.classList.remove("active"));
      this.classList.add("active");
      document
        .getElementById(`${this.dataset.tab}-problem`)
        .classList.add("active");
    });
  });

  // Test cases
  document
    .querySelector(".add-test-case")
    .addEventListener("click", function () {
      const container = document.getElementById("test-cases-container");
      const newCase = document.createElement("div");
      newCase.className = "test-case";
      newCase.innerHTML = `
          <div class="test-case-header">
              <span>Test Case #${container.children.length + 1}</span>
              <span class="test-case-remove">✕ Remove</span>
          </div>
          <div class="io-pair">
              <div><label>Input</label><textarea></textarea></div>
              <div><label>Output</label><textarea></textarea></div>
          </div>
      `;
      container.appendChild(newCase);
      newCase
        .querySelector(".test-case-remove")
        .addEventListener("click", () => container.removeChild(newCase));
    });

  // Markdown preview
  document
    .querySelector(".problem-description")
    .addEventListener("input", function () {
      document.getElementById("description-preview").innerHTML = this.value
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>");
    });

  // Add problem
  document.getElementById("add-problem").addEventListener("click", function () {
    const title = document.querySelector(".problem-title").value;
    if (!title) return alert("Problem title required");

    const problemItem = document.createElement("div");
    problemItem.className = "problem-item";
    problemItem.innerHTML = `<span>${title}</span><button class="remove-problem">✕</button>`;
    document.getElementById("selected-problems").appendChild(problemItem);
    problemItem
      .querySelector(".remove-problem")
      .addEventListener("click", () => problemItem.remove());
  });

  // Form submission
  document
    .getElementById("create-contest-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      if (!document.getElementById("contest-name").value)
        return alert("Contest name required");
      if (document.getElementById("selected-problems").children.length === 0)
        return alert("Add at least one problem");
      alert("Contest created successfully!");
    });
});
