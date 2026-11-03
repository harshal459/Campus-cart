"use strict";

const messageBox = document.getElementById("auth-message");

function showMessage(message, type) {
  messageBox.textContent = message;
  messageBox.className = `auth-message auth-message--${type}`;
  messageBox.hidden = false;
}

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf");
  const result = await response.json();
  if (!response.ok || !result.csrfToken) {
    throw new Error(result.error || "Could not start a secure session. Please try again.");
  }
  return result.csrfToken;
}

document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const passwordInput = document.getElementById(button.dataset.passwordTarget);
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    button.textContent = showPassword ? "Hide" : "Show";
    button.setAttribute("aria-label", `${showPassword ? "Hide" : "Show"} password`);
    button.setAttribute("aria-pressed", String(showPassword));
  });
});

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    messageBox.hidden = true;

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const submitButton = loginForm.querySelector('[type="submit"]');
    submitButton.disabled = true;

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not log in.");

      showMessage(`Welcome, ${result.user.name}! Redirecting...`, "success");
      window.location.assign("/");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    messageBox.hidden = true;

    const details = {
      name: document.getElementById("signup-name").value.trim(),
      email: document.getElementById("signup-email").value.trim(),
      college: "NMIMS University",
      password: document.getElementById("signup-password").value,
      confirmPassword: document.getElementById("signup-confirm-password").value,
    };

    if (!signupForm.reportValidity()) return;
    if (details.password.length < 8) {
      showMessage("Password must be at least 8 characters long.", "error");
      return;
    }
    if (details.password !== details.confirmPassword) {
      showMessage("Password and confirm password do not match.", "error");
      return;
    }

    const submitButton = signupForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(details),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create your account.");

      signupForm.reset();
      showMessage(`${result.message} Go to the Log In link below to continue.`, "success");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}
