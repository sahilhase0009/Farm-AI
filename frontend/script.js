// Use a relative URL so it works on the deployed site
const API = "/api";
const token = localStorage.getItem('token');

// --- Authentication Check ---
if (!token && window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
    window.location.href = 'login.html';
}

// --- General API Fetch Function ---
async function fetchWithAuth(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'x-auth-token': token,
        ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
    return response;
}

// --- Page Setup ---
window.onload = () => {
    // Only run main app logic if we are on the index page
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        loadLaborers();
        loadLatestNote();
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }
};

async function loadLatestNote() {
  try {
    const res = await fetchWithAuth(`${API}/notes/latest`);
    const note = await res.json();
    document.getElementById("crop-notes").value = note.content;
  } catch (err) {
    console.error('Could not load latest note.');
  }
}

async function addLaborer() {
  const name = prompt("Enter laborer name:");
  if (!name) return;
  const dailyWage = prompt("Enter daily wage for " + name + ":");
  if (!dailyWage || isNaN(dailyWage)) {
    return alert("Please enter a valid number for the daily wage.");
  }
  await fetchWithAuth(`${API}/laborers`, {
    method: "POST",
    body: JSON.stringify({ name, dailyWage: Number(dailyWage) }),
  });
  loadLaborers();
}

async function deleteLaborer(id) {
  if (!confirm("Are you sure?")) return;
  await fetchWithAuth(`${API}/laborers/${id}`, { method: "DELETE" });
  loadLaborers();
}

async function loadLaborers() {
  try {
    const res = await fetchWithAuth(`${API}/laborers`);
    const data = await res.json();
    const list = document.getElementById("laborer-list");
    const attendance = document.getElementById("attendance-list");
    list.innerHTML = "";
    attendance.innerHTML = "";
    data.forEach(lab => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `<span>${lab.name}</span><button class="btn btn-sm btn-danger" onclick="deleteLaborer('${lab._id}')">🗑</button>`;
      list.appendChild(li);
      const checkboxDiv = document.createElement("div");
      checkboxDiv.className = "form-check";
      checkboxDiv.innerHTML = `<input class="form-check-input" type="checkbox" value="${lab._id}" id="check-${lab._id}"><label class="form-check-label" for="check-${lab._id}">${lab.name}</label>`;
      attendance.appendChild(checkboxDiv);
    });
  } catch (err) {
    console.error("Failed to load laborers:", err);
  }
}

async function saveAttendance() {
  const date = document.getElementById("att-date").value;
  if (!date) return alert("Please select a date.");
  const ids = Array.from(document.querySelectorAll("#attendance-list input:checked")).map(c => c.value);
  await fetchWithAuth(`${API}/attendance`, {
    method: "POST",
    body: JSON.stringify({ date, ids }),
  });
  alert("Attendance Saved");
  document.querySelectorAll("#attendance-list input:checked").forEach(input => input.checked = false);
}

async function saveNotes() {
  const note = document.getElementById("crop-notes").value;
  if (!note.trim()) return alert("Note cannot be empty.");
  await fetchWithAuth(`${API}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
  alert("Note Saved");
}

async function analyzeNotes() {
  const noteContent = document.getElementById("crop-notes").value;
  if (!noteContent.trim()) return alert("Please enter a crop note to analyze.");
  const button = document.querySelector('.btn-warning');
  const responseArea = document.getElementById("ai-response");
  button.disabled = true;
  button.textContent = 'Analyzing...';
  responseArea.value = "";
  try {
    const res = await fetchWithAuth(`${API}/ai/analyze`, {
      method: 'POST',
      body: JSON.stringify({ note: noteContent })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.response || 'Analysis failed');
    responseArea.value = data.response;
  } catch (error) {
    responseArea.value = error.message;
  } finally {
    button.disabled = false;
    button.textContent = 'Analyze My Crop Notes';
  }
}

async function generateReport() {
  const res = await fetchWithAuth(`${API}/salary`);
  const data = await res.json();
  const summaryDiv = document.getElementById("salary-summary");
  summaryDiv.innerHTML = "";
  if (data.length === 0) {
    summaryDiv.textContent = "No data to display.";
    return;
  }
  const table = document.createElement('table');
  table.className = 'table table-bordered table-striped mt-2';
  table.innerHTML = `<thead class="table-dark"><tr><th>Laborer Name</th><th>Days Worked</th><th>Total Salary (₹)</th></tr></thead>`;
  const tbody = table.createTBody();
  data.forEach(item => {
    const row = tbody.insertRow();
    row.innerHTML = `<td>${item.name}</td><td>${item.daysWorked}</td><td>${item.salary.toFixed(2)}</td>`;
  });
  table.appendChild(tbody);
  summaryDiv.appendChild(table);
}
