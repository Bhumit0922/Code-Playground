document.addEventListener("DOMContentLoaded", function () {
  const signInSection = document.getElementById("signin-section");
  const signUpSection = document.getElementById("signup-section");

  const switchToSignup = document.getElementById("switch-to-signup");
  const switchToSignin = document.getElementById("switch-to-signin");

  const googleBtn = document.querySelector(".google-btn");
  const appleBtn = document.querySelector(".apple-btn");

  // Initially set Sign In as active
  signInSection.classList.add("active");

  function switchAuthMode(activeSection, inactiveSection) {
    activeSection.classList.add("active");
    inactiveSection.classList.remove("active");

    // Ensure only the active section's button is yellow
    activeSection.querySelector(".CP_button").style.background = "#FFC107";
    activeSection.querySelector(".CP_button").style.color = "#1d1d1d";

    inactiveSection.querySelector(".CP_button").style.background = "#605dff";
    inactiveSection.querySelector(".CP_button").style.color = "#ffffff";

    // Change Social Login Button Color When on Sign-Up
    if (activeSection === signUpSection) {
      googleBtn.style.background = "#605dff"; // Blue
      googleBtn.style.color = "#ffffff"; // White text
      appleBtn.style.background = "#605dff"; // Blue
      appleBtn.style.color = "#ffffff"; // White text
    } else {
      googleBtn.style.background = "white"; // Default white
      googleBtn.style.color = "#1d1d1d"; // Black text
      appleBtn.style.background = "white";
      appleBtn.style.color = "#1d1d1d";
    }
  }

  // Click event for Sign Up
  switchToSignup.addEventListener("click", function () {
    switchAuthMode(signUpSection, signInSection);
  });

  // Click event for Sign In
  switchToSignin.addEventListener("click", function () {
    switchAuthMode(signInSection, signUpSection);
  });

  // Click event for the sections themselves
  signInSection.addEventListener("click", function () {
    switchAuthMode(signInSection, signUpSection);
  });

  signUpSection.addEventListener("click", function () {
    switchAuthMode(signUpSection, signInSection);
  });
});
