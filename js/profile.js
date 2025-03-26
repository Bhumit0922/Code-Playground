document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".sidebar li");
  const contents = document.querySelectorAll(".tab-content");
  const badgePopup = document.getElementById("badge-popup");
  const badgeTitle = document.getElementById("badge-title");
  const closePopupBtn = document.getElementById("close-popup");

  function switchTab(tabId) {
    contents.forEach((content) => content.classList.add("hidden"));
    document.getElementById(tabId).classList.remove("hidden");

    tabs.forEach((tab) => tab.classList.remove("active"));
    document
      .querySelector(`[onclick="switchTab('${tabId}')"]`)
      .classList.add("active");
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      switchTab(this.getAttribute("onclick").split("'")[1]);
    });
  });

  switchTab("overview");

  // Badge Click to Maximize
  document.querySelectorAll(".badge").forEach((badge) => {
    badge.addEventListener("click", function () {
      badgeTitle.textContent = this.textContent;
      badgePopup.style.display = "block";
    });
  });

  closePopupBtn.addEventListener("click", function () {
    badgePopup.style.display = "none";
  });

  // Form Submissions
  document
    .getElementById("save-changes")
    .addEventListener("click", function () {
      alert("Changes saved!");
    });

  document
    .getElementById("delete-account")
    .addEventListener("click", function () {
      if (
        confirm(
          "Are you sure you want to delete your account? This cannot be undone!"
        )
      ) {
        alert("Account deleted.");
      }
    });
});
