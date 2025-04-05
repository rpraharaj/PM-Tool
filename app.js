/**
 * IT Project Milestone Management Tool - Core Script
 * --------------------------------------------------
 * Handles:
 * - Project & milestone data management
 * - Local Storage persistence
 * - UI event handling
 * - Placeholder hooks for visualization modules
 */

// Data model
let projects = []; // Array of project objects
let activeProjectId = null;

// Load data from Local Storage
function loadData() {
  const saved = localStorage.getItem('itpm_projects');
  if (saved) {
    projects = JSON.parse(saved);
    // Ensure backward compatibility: add tasks array if missing
    projects.forEach(project => {
      if (!project.tasks) {
        project.tasks = [];
      }
    });
  } else {
    projects = [];
  }
}

// Save data to Local Storage
function saveData() {
  localStorage.setItem('itpm_projects', JSON.stringify(projects));
}

// Generate unique ID
function generateId() {
  return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// Render project list in sidebar
function renderProjectList() {
  const list = document.getElementById('project-list');
  list.innerHTML = '';
  projects.forEach(project => {
    const li = document.createElement('li');
    li.className = 'nav-item';
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'nav-link' + (project.id === activeProjectId ? ' active' : '');
    a.textContent = project.name;
    a.onclick = () => {
      activeProjectId = project.id;
      saveData();
      renderProjectList();
      renderAllViews();
    };
    li.appendChild(a);
    list.appendChild(li);
  });

  // Show/hide milestone buttons
  const milestoneActions = document.getElementById('milestone-actions');
  if (activeProjectId) {
    milestoneActions.style.display = 'block';
  } else {
    milestoneActions.style.display = 'none';
  }
}

// Show project creation modal
function showProjectModal() {
  const modal = new bootstrap.Modal(document.getElementById('projectModal'));
  document.getElementById('project-form').reset();
  modal.show();
}

// Handle project form submit
function handleProjectFormSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('project-name').value.trim();
  if (!name) {
    alert('Project name is required.');
    return;
  }
  const description = document.getElementById('project-description').value.trim();
  const team = document.getElementById('project-team').value.trim().split(',').map(s => s.trim()).filter(Boolean);
  const startDate = document.getElementById('project-start').value;
  const endDate = document.getElementById('project-end').value;

  const newProject = {
    id: generateId(),
    name,
    description,
    team,
    startDate,
    endDate,
    milestones: [],
    tasks: []
  };
  projects.push(newProject);
  activeProjectId = newProject.id;
  saveData();
  renderProjectList();
  renderAllViews();
  bootstrap.Modal.getInstance(document.getElementById('projectModal')).hide();
}

// Reset all data
function resetData() {
  if (confirm('Are you sure you want to clear all projects and milestones?')) {
    localStorage.removeItem('itpm_projects');
    projects = [];
    activeProjectId = null;
    renderProjectList();
    renderAllViews();
  }
}

// Render all visualization views (placeholders for now)
function renderAllViews() {
  renderTimeline();
  renderGantt();
  renderKanban();
  renderCalendar();
}

// Placeholder: Timeline
function renderTimeline() {
  const container = document.getElementById('timeline-container');
  container.innerHTML = '<p>Select a project to view its timeline.</p>';
  const project = projects.find(p => p.id === activeProjectId);
  if (!project) return;

  const groups = new vis.DataSet([
    ...project.tasks.map(t => ({
      id: 't_' + t.id,
      content: '🗒️ ' + t.title
    }))
  ]);

  const items = new vis.DataSet([
    ...project.milestones.map(m => ({
      id: m.id,
      content: '🚩 ' + m.title,
      start: m.dueDate,
      type: 'point',
      className: 'milestone-flag ' + m.status.toLowerCase().replace(' ', '-')
    })),
    ...project.tasks.map(t => ({
      id: t.id,
      content: '',
      start: t.startDate,
      end: t.endDate,
      group: 't_' + t.id,
      className: t.status.toLowerCase().replace(' ', '-')
    }))
  ]);

  const options = {
    editable: false,
    margin: { item: 20 },
    zoomable: true,
    stack: false
  };

  const timeline = new vis.Timeline(container, items, groups, options);

  // Set range button
  document.getElementById('set-timeline-range-btn').onclick = () => {
    const start = document.getElementById('timeline-start-date').value;
    const end = document.getElementById('timeline-end-date').value;
    if (!start || !end) {
      alert('Please select both start and end dates.');
      return;
    }
    timeline.setWindow(new Date(start), new Date(end));
  };

  // Reset range button
  document.getElementById('reset-timeline-range-btn').onclick = () => {
    timeline.fit();
  };
}

// Placeholder: Gantt Chart
function renderGantt() {
  const container = document.getElementById('gantt-container');
  container.innerHTML = '';
  const project = projects.find(p => p.id === activeProjectId);
  if (!project) {
    container.innerHTML = '<p>Select a project to view its Gantt chart.</p>';
    return;
  }

  const tasks = [
    ...project.milestones.map(m => ({
      id: m.id,
      name: '🚩 ' + m.title,
      start: m.dueDate || project.startDate,
      end: m.dueDate || project.endDate,
      progress: m.status === 'Completed' ? 100 : (m.status === 'In Progress' ? 50 : 0),
      custom_class: 'milestone-bar',
      dependencies: ''
    })),
    ...project.tasks.map(t => ({
      id: t.id,
      name: '🗒️ ' + t.title,
      start: t.startDate,
      end: t.endDate,
      progress: t.status === 'Completed' ? 100 : (t.status === 'In Progress' ? 50 : 0),
      dependencies: ''
    }))
  ];

  const viewModeSelect = document.getElementById('gantt-view-mode');
  let viewMode = 'Day';
  if (viewModeSelect) {
    const selected = viewModeSelect.value;
    if (selected === 'Quarter') {
      viewMode = 'Month'; // Approximate quarters with months
    } else {
      viewMode = selected;
    }
  }

  new Gantt(container, tasks, {
    view_mode: viewMode,
    language: 'en'
  });

  if (viewModeSelect && !viewModeSelect._listenerAdded) {
    viewModeSelect.addEventListener('change', () => {
      renderGantt();
    });

    const modes = ['Day', 'Week', 'Month', 'Year'];

    document.getElementById('gantt-zoom-in-btn').onclick = () => {
      let current = viewModeSelect.value;
      if (current === 'Quarter') current = 'Month';
      let idx = modes.indexOf(current);
      if (idx > 0) {
        viewModeSelect.value = modes[idx - 1];
        renderGantt();
      }
    };

    document.getElementById('gantt-zoom-out-btn').onclick = () => {
      let current = viewModeSelect.value;
      if (current === 'Quarter') current = 'Month';
      let idx = modes.indexOf(current);
      if (idx < modes.length - 1) {
        viewModeSelect.value = modes[idx + 1];
        renderGantt();
      }
    };

    viewModeSelect._listenerAdded = true;
  }
}

// Placeholder: Kanban Board
function renderKanban() {
  const columns = document.querySelectorAll('#kanban-columns .kanban-column');
  const project = projects.find(p => p.id === activeProjectId);

  // Clear columns and add headers with counts
  columns.forEach(col => {
    const status = col.getAttribute('data-status');
    let milestoneCount = 0;
    let taskCount = 0;
    if (project) {
        milestoneCount = project.milestones.filter(m => m.status === status).length;
        taskCount = project.tasks.filter(t => t.status === status).length;
    }
    col.innerHTML = `
      <h5 class="d-flex justify-content-between align-items-center mb-2">
        <span>${status}</span>
        <button class="btn btn-sm btn-outline-primary add-task-in-column-btn" data-status="${status}">+</button>
      </h5>
      <div class="mb-1"><span class="badge bg-primary">Milestones: ${milestoneCount}</span></div>
      <div class="mb-2"><span class="badge bg-success">Tasks: ${taskCount}</span></div>
      <div class="kanban-milestones mb-2"></div>
      <div class="kanban-tasks"></div>
    `;
  });

  // Add event listeners for the new buttons
  document.querySelectorAll('.add-task-in-column-btn').forEach(btn => {
      btn.onclick = (e) => {
          e.stopPropagation();
          const status = btn.getAttribute('data-status');
          showTaskModal(null, status);
      };
  });

  if (!project) return;

  project.milestones.forEach(m => {
    const card = document.createElement('div');
    card.className = 'kanban-item milestone-card card p-2 mb-2 shadow-sm';
    card.innerHTML = `
      <div class="fw-bold">📍 ${m.title}</div>
      ${m.dueDate ? `<small class="text-muted">Due: ${m.dueDate}</small>` : ''}
    `;
    card.setAttribute('draggable', 'true');
    card.dataset.id = m.id;
    card.dataset.type = 'milestone';

    card.onclick = () => showMilestoneModal(m);

    const status = m.status === 'Not Started' ? 'Backlog' : m.status;
    const col = document.querySelector(`#kanban-columns .kanban-column[data-status="${status}"] .kanban-milestones`);
    if (col) col.appendChild(card);
  });

  project.tasks.forEach(t => {
    const card = document.createElement('div');
    card.className = 'kanban-item task-card card p-2 mb-2 shadow-sm';
    card.innerHTML = `
      <div class="fw-bold">🗒️ ${t.title}</div>
      <small class="text-muted">Start: ${t.startDate}</small><br/>
      <small class="text-muted">End: ${t.endDate}</small>
    `;
    card.setAttribute('draggable', 'true');
    card.dataset.id = t.id;
    card.dataset.type = 'task';

    card.onclick = () => showTaskModal(t);

    const status = t.status === 'Not Started' ? 'Backlog' : t.status;
    const col = document.querySelector(`#kanban-columns .kanban-column[data-status="${status}"] .kanban-tasks`);
    if (col) col.appendChild(card);
  });

  // Initialize Dragula
  if (window.kanbanDrake) { // Destroy previous instance if exists
      window.kanbanDrake.destroy();
  }
  window.kanbanDrake = dragula(Array.from(columns)).on('drop', (el, target, source, sibling) => {
    const newStatus = target.getAttribute('data-status');
    const itemId = el.dataset.id;
    const itemType = el.dataset.type;
    const project = projects.find(p => p.id === activeProjectId);
    if (!project) {
      console.warn('No active project found.');
      return;
    }

    console.log(`Dropped item ID: ${itemId}, type: ${itemType}, new status: ${newStatus}`);

    let item = null;
    if (itemType === 'milestone') {
        item = project.milestones.find(m => m.id === itemId);
    } else if (itemType === 'task') {
        item = project.tasks.find(t => t.id === itemId);
    }

    if (item) {
      console.log('Found item:', item);
      item.status = newStatus;
      saveData();
      renderAllViews();
    } else {
      console.warn('Item not found in project data. Moving back.');
      source.appendChild(el);
    }
  });
}

// Placeholder: Calendar
function renderCalendar() {
  const container = document.getElementById('calendar-container');
  container.innerHTML = '';
  const project = projects.find(p => p.id === activeProjectId);
  if (!project) {
    container.innerHTML = '<p>Select a project to view its calendar.</p>';
    return;
  }

  const calendar = new FullCalendar.Calendar(container, {
    initialView: 'dayGridMonth',
    events: [
      ...project.milestones.map(m => ({
        id: m.id,
        title: '📍 ' + m.title,
        start: m.dueDate
      })),
      ...project.tasks.map(t => ({
        id: t.id,
        title: '🗒️ ' + t.title,
        start: t.startDate,
        end: t.endDate
      }))
    ],
    dateClick: function(info) {
      alert('Clicked on: ' + info.dateStr);
      // Optionally open milestone or task creation modal pre-filled with this date
    },
    eventDrop: function(info) {
      const project = projects.find(p => p.id === activeProjectId);
      if (!project) return;

      const milestone = project.milestones.find(m => m.id === info.event.id);
      if (milestone) {
        milestone.dueDate = info.event.startStr;
      } else {
        const task = project.tasks.find(t => t.id === info.event.id);
        if (task) {
          task.startDate = info.event.startStr;
          if (info.event.end) {
            task.endDate = info.event.endStr;
          }
        }
      }
      saveData();
      renderAllViews();
    },
    editable: true
  });
  calendar.render();
}

// Initialize app
function init() {
  loadData();
  renderProjectList();
  renderAllViews();

  document.getElementById('add-project-btn').onclick = showProjectModal;
  document.getElementById('reset-data-btn').onclick = resetData;
  document.getElementById('project-form').onsubmit = handleProjectFormSubmit;

  document.getElementById('add-milestone-btn').onclick = () => showMilestoneModal();
  document.getElementById('milestone-form').onsubmit = handleMilestoneFormSubmit;

  document.getElementById('add-task-btn').onclick = () => {
    console.log('Add Task button clicked');
    showTaskModal();
  };
  document.getElementById('task-form').onsubmit = handleTaskFormSubmit;

  document.getElementById('apply-template-btn').onclick = applyTemplateToProject;

  // Export JSON
  document.getElementById('export-json-btn').onclick = () => {
    try {
      console.log('Exporting JSON...');
      const dataStr = JSON.stringify(projects, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'projects.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Exported projects as JSON successfully.');
    } catch (err) {
      console.error('Error exporting JSON:', err);
      alert('Error exporting JSON: ' + err.message);
    }
  };

  document.getElementById('export-csv-btn').onclick = () => {
    try {
      console.log('Exporting CSV...');
      let csv = 'Project,Type,Title,Description,Start Date,End Date,Status,Priority\n';
      projects.forEach(p => {
        p.milestones.forEach(m => {
          csv += `"${p.name}","Milestone","${m.title}","${m.description || ''}","${m.dueDate || ''}","${m.dueDate || ''}","${m.status}","${m.color || ''}"\n`;
        });
        p.tasks.forEach(t => {
          csv += `"${p.name}","Task","${t.title}","${t.description || ''}","${t.startDate}","${t.endDate}","${t.status}","${t.color || ''}"\n`;
        });
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'projects.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Exported projects as CSV successfully.');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Error exporting CSV: ' + err.message);
    }
  };

  document.getElementById('export-pdf-btn').onclick = () => {
    try {
      console.log('Exporting PDF...');
      const doc = new jspdf.jsPDF();
      let y = 10;
      projects.forEach(p => {
        doc.setFontSize(14);
        doc.text(`Project: ${p.name}`, 10, y);
        y += 8;
        doc.setFontSize(12);
        doc.text('Milestones:', 10, y);
        y += 6;
        p.milestones.forEach(m => {
          doc.text(`- ${m.title} (${m.status}) Due: ${m.dueDate || ''}`, 12, y);
          y += 6;
          if (y > 280) { doc.addPage(); y = 10; }
        });
        y += 4;
        doc.text('Tasks:', 10, y);
        y += 6;
        p.tasks.forEach(t => {
          doc.text(`- ${t.title} (${t.status}) ${t.startDate} to ${t.endDate}`, 12, y);
          y += 6;
          if (y > 280) { doc.addPage(); y = 10; }
        });
        y += 10;
        if (y > 280) { doc.addPage(); y = 10; }
      });
      doc.save('projects.pdf');
      alert('Exported projects as PDF successfully.');
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Error exporting PDF: ' + err.message);
    }
  };

  // Import JSON
  document.getElementById('import-json-btn').onclick = () => {
    const fileInput = document.getElementById('import-json-input');
    if (!fileInput.files.length) {
      alert('Please select a JSON file to import.');
      return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        console.log('Importing JSON...');
        const imported = JSON.parse(e.target.result);
        console.log('Imported data:', imported);
        if (!Array.isArray(imported)) {
          alert('Invalid JSON format: expected an array of projects.');
          return;
        }
        imported.forEach(p => {
          if (!p.id) p.id = generateId();
          if (!p.milestones) p.milestones = [];
          if (!p.tasks) p.tasks = [];
        });
        projects = imported;
        saveData();
        renderProjectList();
        renderAllViews();
        alert('Projects imported successfully.');
      } catch (err) {
        console.error('Error parsing JSON:', err);
        alert('Error parsing JSON: ' + err.message);
      }
    };
    reader.onerror = function() {
      console.error('Error reading file.');
      alert('Error reading file.');
    };
    reader.readAsText(file);
  };

  // Export CSV
  document.getElementById('export-csv-btn').onclick = () => {
    let csv = 'Project,Type,Title,Description,Start Date,End Date,Status,Priority\n';
    projects.forEach(p => {
      p.milestones.forEach(m => {
        csv += `"${p.name}","Milestone","${m.title}","${m.description || ''}","${m.dueDate || ''}","${m.dueDate || ''}","${m.status}","${m.color || ''}"\n`;
      });
      p.tasks.forEach(t => {
        csv += `"${p.name}","Task","${t.title}","${t.description || ''}","${t.startDate}","${t.endDate}","${t.status}","${t.color || ''}"\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export PDF
  document.getElementById('export-pdf-btn').onclick = () => {
    const doc = new jspdf.jsPDF();
    let y = 10;
    projects.forEach(p => {
      doc.setFontSize(14);
      doc.text(`Project: ${p.name}`, 10, y);
      y += 8;
      doc.setFontSize(12);
      doc.text('Milestones:', 10, y);
      y += 6;
      p.milestones.forEach(m => {
        doc.text(`- ${m.title} (${m.status}) Due: ${m.dueDate || ''}`, 12, y);
        y += 6;
        if (y > 280) { doc.addPage(); y = 10; }
      });
      y += 4;
      doc.text('Tasks:', 10, y);
      y += 6;
      p.tasks.forEach(t => {
        doc.text(`- ${t.title} (${t.status}) ${t.startDate} to ${t.endDate}`, 12, y);
        y += 6;
        if (y > 280) { doc.addPage(); y = 10; }
      });
      y += 10;
      if (y > 280) { doc.addPage(); y = 10; }
    });
    doc.save('projects.pdf');
  };

  // TODO: Add event listeners for import/export buttons
}

window.onload = init;

// Show task modal (add or edit)
function showTaskModal(task = null, defaultStatus = 'Not Started') {
  const modal = new bootstrap.Modal(document.getElementById('taskModal'));
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = task ? task.id : '';
  document.getElementById('task-title').value = task ? task.title : '';
  document.getElementById('task-description').value = task ? task.description : '';
  document.getElementById('task-start').value = task ? task.startDate : '';
  document.getElementById('task-end').value = task ? task.endDate : '';
  document.getElementById('task-status').value = task ? task.status : defaultStatus; // Use default status if provided
  document.getElementById('task-priority').value = task ? (task.color || '#28a745') : '#28a745';

  const deleteBtn = document.getElementById('delete-task-btn');
  if (task) {
    deleteBtn.style.display = 'inline-block';
    deleteBtn.onclick = () => deleteTask(task.id);
  } else {
    deleteBtn.style.display = 'none';
    deleteBtn.onclick = null;
  }

  modal.show();
}

// Handle task form submit
function handleTaskFormSubmit(event) {
  event.preventDefault();
  const project = projects.find(p => p.id === activeProjectId);
  if (!project) return;

  const id = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const startDate = document.getElementById('task-start').value;
  const endDate = document.getElementById('task-end').value;
  const status = document.getElementById('task-status').value;
  const color = document.getElementById('task-priority').value;

  if (!title || !startDate || !endDate) {
    alert('Title, Start Date, and End Date are required.');
    return;
  }

  if (id) {
    const task = project.tasks.find(t => t.id === id);
    if (task) {
      task.title = title;
      task.description = description;
      task.startDate = startDate;
      task.endDate = endDate;
      task.status = status;
      task.color = color;
    }
  } else {
    project.tasks.push({
      id: generateId(),
      title,
      description,
      startDate,
      endDate,
      status,
      color
    });
  }

  saveData();
  renderAllViews();
  bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
}

// Delete task
function deleteTask(id) {
  const project = projects.find(p => p.id === activeProjectId);
  if (!project) return;
  if (!confirm('Delete this task?')) return;
  project.tasks = project.tasks.filter(t => t.id !== id);
  saveData();
  renderAllViews();
  bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
}

// Predefined templates
const templates = {
  "Software Launch": [
    { title: "Requirements Gathering", status: "Not Started" },
    { title: "Design Phase", status: "Not Started" },
    { title: "Development", status: "Not Started" },
    { title: "Testing", status: "Not Started" },
    { title: "Deployment", status: "Not Started" },
    { title: "Post-launch Review", status: "Not Started" }
  ],
  "Website Redesign": [
    { title: "Audit Current Site", status: "Not Started" },
    { title: "Wireframes", status: "Not Started" },
    { title: "Mockups", status: "Not Started" },
    { title: "Development", status: "Not Started" },
    { title: "Content Migration", status: "Not Started" },
    { title: "Launch", status: "Not Started" }
  ]
};

// Apply template to active project
function applyTemplateToProject() {
  const project = projects.find(p => p.id === activeProjectId);
  if (!project) return;

  const templateNames = Object.keys(templates);
  const choice = prompt("Enter template name:\n" + templateNames.join("\n"));
  if (!choice || !templates[choice]) {
    alert("Template not found.");
    return;
  }

  const templateMilestones = templates[choice];
  templateMilestones.forEach(t => {
    project.milestones.push({
      id: generateId(),
      title: t.title,
      description: '',
      dueDate: '',
      status: t.status,
      color: '#007bff'
    });
  });

  saveData();
  renderAllViews();
}

// Show milestone modal (for add or edit)
function showMilestoneModal(milestone = null) {
  const modal = new bootstrap.Modal(document.getElementById('milestoneModal'));
  document.getElementById('milestone-form').reset();
  document.getElementById('milestone-id').value = milestone ? milestone.id : '';
  document.getElementById('milestone-title').value = milestone ? milestone.title : '';
  document.getElementById('milestone-description').value = milestone ? milestone.description : '';
  document.getElementById('milestone-due').value = milestone ? milestone.dueDate : '';
  document.getElementById('milestone-status').value = milestone ? milestone.status : 'Not Started';
  document.getElementById('milestone-priority').value = milestone ? (milestone.color || '#007bff') : '#007bff';

  const deleteBtn = document.getElementById('delete-milestone-btn');
  if (milestone) {
    deleteBtn.style.display = 'inline-block';
    deleteBtn.onclick = () => deleteMilestone(milestone.id);
  } else {
    deleteBtn.style.display = 'none';
    deleteBtn.onclick = null;
  }

  modal.show();
}

// Handle milestone form submit
function handleMilestoneFormSubmit(event) {
  event.preventDefault();
  const project = projects.find(p => p.id === activeProjectId);
  if (!project) return;

  const id = document.getElementById('milestone-id').value;
  const title = document.getElementById('milestone-title').value.trim();
  if (!title) {
    alert('Milestone title is required.');
    return;
  }
  const description = document.getElementById('milestone-description').value.trim();
  const dueDate = document.getElementById('milestone-due').value;
  const status = document.getElementById('milestone-status').value;
  const color = document.getElementById('milestone-priority').value;

  if (id) {
    // Update existing
    const milestone = project.milestones.find(m => m.id === id);
    if (milestone) {
      milestone.title = title;
      milestone.description = description;
      milestone.dueDate = dueDate;
      milestone.status = status;
      milestone.color = color;
    }
  } else {
    // Add new
    project.milestones.push({
      id: generateId(),
      title,
      description,
      dueDate,
      status,
      color
    });
  }

  saveData();
  renderAllViews();
  bootstrap.Modal.getInstance(document.getElementById('milestoneModal')).hide();
}

// Delete milestone
function deleteMilestone(id) {
  const project = projects.find(p => p.id === activeProjectId);
  if (!project) return;
  if (!confirm('Delete this milestone?')) return;
  project.milestones = project.milestones.filter(m => m.id !== id);
  saveData();
  renderAllViews();
  bootstrap.Modal.getInstance(document.getElementById('milestoneModal')).hide();
}
