document.addEventListener("DOMContentLoaded", function () {
  const leaderboardTable = document.querySelector(".leaderboard-table tbody");
  const currentPageElement = document.getElementById("current-page");
  const prevPageBtn = document.getElementById("prev-page");
  const nextPageBtn = document.getElementById("next-page");
  const selectContest = document.getElementById("select-contest");

  let participants = [];
  let currentPage = 1;
  const entriesPerPage = 10;

  // Function to fetch leaderboard data
  function fetchParticipants() {
    let totalParticipants = Math.floor(Math.random() * 50) + 10; // Random between 10 and 60
    participants = Array.from({ length: totalParticipants }, (_, i) => ({
      rank: i + 1,
      username: `User${i + 1}`,
      score: Math.floor(Math.random() * 1000),
    }));

    updateLeaderboard(); // Does NOT reset page number now
  }

  // Function to update leaderboard
  function updateLeaderboard() {
    const totalPages = Math.ceil(participants.length / entriesPerPage) || 1;

    const startIndex = (currentPage - 1) * entriesPerPage;
    const displayedParticipants = participants.slice(
      startIndex,
      startIndex + entriesPerPage
    );

    leaderboardTable.innerHTML = "";

    displayedParticipants.forEach((participant) => {
      const row = `<tr>
                <td>${participant.rank}</td>
                <td>${participant.username}</td>
                <td>${participant.score}</td>
            </tr>`;
      leaderboardTable.innerHTML += row;
    });

    // Maintain fixed table size (fill empty rows)
    let remainingRows = entriesPerPage - displayedParticipants.length;
    for (let i = 0; i < remainingRows; i++) {
      leaderboardTable.innerHTML += `<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
    }

    currentPageElement.textContent = `${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  // Pagination controls
  prevPageBtn.addEventListener("click", function () {
    if (currentPage > 1) {
      currentPage--;
      updateLeaderboard();
    }
  });

  nextPageBtn.addEventListener("click", function () {
    const totalPages = Math.ceil(participants.length / entriesPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      updateLeaderboard();
    }
  });

  // Contest selection: Now keeps the current page instead of resetting to Page 1
  if (selectContest) {
    selectContest.addEventListener("change", function () {
      fetchParticipants(); // Keeps the last viewed page instead of resetting
    });
  }

  // Load initial leaderboard
  fetchParticipants();
});
