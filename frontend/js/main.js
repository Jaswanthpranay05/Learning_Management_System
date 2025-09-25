// Handle Signup
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirm").value;

    if (password !== confirm) {
      document.getElementById("signupMsg").innerText = "Passwords do not match!";
      return;
    }

    const result = await signup(name, email, password);
    document.getElementById("signupMsg").innerText = result.msg || "Signup successful!";
  });
}

// Handle Login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const result = await login(email, password);
    if (result.token) {
      localStorage.setItem("token", result.token);
      document.getElementById("loginMsg").innerText = "Login successful!";
      setTimeout(() => (window.location.href = "courses.html"), 1000);
    } else {
      document.getElementById("loginMsg").innerText = result.msg || "Login failed!";
    }
  });
}

// Load Courses
if (window.location.pathname.includes("courses.html")) {
  window.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("courses-container");
    const courses = await getCourses();
    container.innerHTML = courses
      .map(
        (c) => `
      <div class="course-card">
        <h3>${c.title}</h3>
        <p>${c.description}</p>
        <button>Enroll</button>
      </div>
    `
      )
      .join("");
  });
}
