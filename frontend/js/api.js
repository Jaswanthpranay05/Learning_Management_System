const API_URL = "https://learning-management-system-6op9.onrender.com/"; // Replace with your deployed backend

// Auth APIs
async function signup(name, email, password) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return res.json();
}

async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

// Courses APIs
async function getCourses() {
  try {
    const res = await fetch(`${API_URL}/courses`);
    if (!res.ok) throw new Error("Failed to fetch courses");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function addCourse(course) {
  try {
    const res = await fetch(`${API_URL}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(course)
    });
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}
