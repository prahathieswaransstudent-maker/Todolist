"use strict";

const STORAGE_KEY = "todo-list.tasks";
const MAX_TASK_LENGTH = 120;

const addForm = document.querySelector("#add-form");
const newTaskInput = document.querySelector("#new-task");
const taskList = document.querySelector("#task-list");
const taskCount = document.querySelector("#task-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const notice = document.querySelector("#notice");
const filterButtons = document.querySelectorAll("[data-filter]");

let tasks = loadTasks();
let activeFilter = "all";

function loadTasks() {
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEY);
    if (!storedTasks) return [];

    const parsedTasks = JSON.parse(storedTasks);
    if (!Array.isArray(parsedTasks)) {
      throw new Error("Saved task data is not a list.");
    }

    return parsedTasks.filter(
      (task) =>
        task &&
        typeof task.id === "string" &&
        typeof task.text === "string" &&
        task.text.trim().length > 0 &&
        task.text.length <= MAX_TASK_LENGTH &&
        typeof task.completed === "boolean",
    );
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    notice.textContent = "Saved tasks could not be loaded. You can still add new tasks.";
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    notice.textContent = "";
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    notice.textContent = "Changes could not be saved in this browser.";
    return false;
  }
}

function makeTaskId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function visibleTasks() {
  if (activeFilter === "active") return tasks.filter((task) => !task.completed);
  if (activeFilter === "completed") return tasks.filter((task) => task.completed);
  return tasks;
}

function createActionButton(label, action, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `task-action ${className}`.trim();
  button.dataset.action = action;
  button.textContent = label;
  button.setAttribute("aria-label", label);
  return button;
}

function renderTask(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " is-completed" : ""}`;
  item.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.dataset.action = "toggle";
  checkbox.setAttribute("aria-label", `Mark "${task.text}" as ${task.completed ? "active" : "completed"}`);
  item.append(checkbox);

  const label = document.createElement("span");
  label.className = "task-label";
  label.textContent = task.text;
  item.append(label);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const editButton = createActionButton("Edit", "edit");
  editButton.disabled = task.completed;
  actions.append(editButton, createActionButton("Delete", "delete", "delete"));
  item.append(actions);

  return item;
}

function render() {
  const shownTasks = visibleTasks();
  taskList.replaceChildren();

  if (shownTasks.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.textContent =
      tasks.length === 0
        ? "No tasks yet. Add one above to get started."
        : activeFilter === "active"
          ? "All caught up. There are no active tasks."
          : activeFilter === "completed"
            ? "No completed tasks yet."
            : "No tasks match this filter.";
    taskList.append(emptyState);
  } else {
    shownTasks.forEach((task) => taskList.append(renderTask(task)));
  }

  const remainingCount = tasks.filter((task) => !task.completed).length;
  taskCount.textContent = `${remainingCount} ${remainingCount === 1 ? "task" : "tasks"} left`;
  clearCompletedButton.disabled = !tasks.some((task) => task.completed);
}

function updateTask(id, changes) {
  tasks = tasks.map((task) => (task.id === id ? { ...task, ...changes } : task));
  saveTasks();
  render();
}

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = newTaskInput.value.trim();
  if (!text) {
    newTaskInput.focus();
    return;
  }

  tasks.push({ id: makeTaskId(), text: text.slice(0, MAX_TASK_LENGTH), completed: false });
  saveTasks();
  render();
  addForm.reset();
  newTaskInput.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((filterButton) => {
      const selected = filterButton === button;
      filterButton.classList.toggle("is-active", selected);
      filterButton.setAttribute("aria-pressed", String(selected));
    });
    render();
  });
});

taskList.addEventListener("change", (event) => {
  const checkbox = event.target.closest('[data-action="toggle"]');
  if (!checkbox) return;

  const item = checkbox.closest(".task-item");
  if (item) updateTask(item.dataset.id, { completed: checkbox.checked });
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = button.closest(".task-item");
  if (!item) return;

  const task = tasks.find((candidate) => candidate.id === item.dataset.id);
  if (!task) return;

  if (button.dataset.action === "delete") {
    tasks = tasks.filter((candidate) => candidate.id !== task.id);
    saveTasks();
    render();
  } else if (button.dataset.action === "edit" && !task.completed) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "edit-input";
    input.maxLength = MAX_TASK_LENGTH;
    input.value = task.text;
    input.setAttribute("aria-label", "Edit task");

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "save-button";
    saveButton.dataset.action = "save-edit";
    saveButton.textContent = "Save";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "cancel-button";
    cancelButton.dataset.action = "cancel-edit";
    cancelButton.textContent = "Cancel";

    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.append(saveButton, cancelButton);
    item.replaceChildren(input, actions);
    input.focus();
    input.select();
  } else if (button.dataset.action === "save-edit") {
    const input = item.querySelector(".edit-input");
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    updateTask(task.id, { text: text.slice(0, MAX_TASK_LENGTH) });
  } else if (button.dataset.action === "cancel-edit") {
    render();
  }
});

taskList.addEventListener("keydown", (event) => {
  if (!event.target.matches(".edit-input")) return;
  if (event.key === "Enter") {
    event.preventDefault();
    event.target.closest(".task-item").querySelector('[data-action="save-edit"]').click();
  } else if (event.key === "Escape") {
    render();
  }
});

clearCompletedButton.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
});

render();
