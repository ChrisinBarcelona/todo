/* ==========================================================================
   Tasks — a dependency-free to-do list.

   State lives in memory as { tasks, editingId } and is mirrored to
   localStorage after every mutation. The list is re-rendered from state, so
   the DOM is never the source of truth. User text is only ever written with
   textContent / value, never innerHTML.
   ========================================================================== */

(() => {
  'use strict';

  const STORAGE_KEY = 'tasks.v1';
  const MAX_LENGTH = 200;

  const ICONS = {
    check:
      '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.4 6.5 11.4 12.5 4.6"/></svg>',
    pencil:
      '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M11.1 2.4a1.65 1.65 0 0 1 2.5 2.1l-.2.2-7.6 7.6-3.1.9.9-3.1z"/><path d="M10.3 3.6l2.1 2.1"/></svg>',
    trash:
      '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M2.8 4.3h10.4"/><path d="M6.3 4.3V3a.9.9 0 0 1 .9-.9h1.6a.9.9 0 0 1 .9.9v1.3"/>' +
      '<path d="M12 4.3l-.5 8.2a1.2 1.2 0 0 1-1.2 1.1H5.7a1.2 1.2 0 0 1-1.2-1.1L4 4.3"/>' +
      '<path d="M6.6 7v4"/><path d="M9.4 7v4"/></svg>',
  };

  const state = { tasks: [], editingId: null };

  const el = {
    list: document.getElementById('task-list'),
    empty: document.getElementById('empty-state'),
    toolbar: document.getElementById('toolbar'),
    form: document.getElementById('compose'),
    input: document.getElementById('task-input'),
    count: document.getElementById('task-count'),
    clear: document.getElementById('clear-all'),
    dialog: document.getElementById('confirm-dialog'),
    dialogBody: document.getElementById('confirm-body'),
    live: document.getElementById('live-region'),
  };

  /* ---------------------------------------------------------------- storage */

  function readStored() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return []; // private mode, or storage disabled
    }
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((task) => task && typeof task.text === 'string' && task.text.trim() !== '')
        .map((task) => ({
          id: typeof task.id === 'string' && task.id ? task.id : createId(),
          text: task.text.slice(0, MAX_LENGTH),
          done: Boolean(task.done),
        }));
    } catch {
      return []; // corrupt payload — start clean rather than crash
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    } catch {
      announce('Changes could not be saved in this browser.');
    }
  }

  /* ---------------------------------------------------------------- helpers */

  const createId = () =>
    (crypto.randomUUID && crypto.randomUUID()) ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const findTask = (id) => state.tasks.find((task) => task.id === id);

  const announce = (message) => {
    el.live.textContent = message;
  };

  /** Parse a trusted, static SVG string into an element. Never used for user text. */
  function svg(markup) {
    const template = document.createElement('template');
    template.innerHTML = markup;
    return template.content.firstElementChild;
  }

  function iconButton(action, label, markup) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-btn';
    button.dataset.action = action;
    button.setAttribute('aria-label', label);
    button.append(svg(markup));
    return button;
  }

  /* ----------------------------------------------------------------- render */

  function taskRow(task) {
    const row = document.createElement('li');
    row.className = task.done ? 'task task--done' : 'task';
    row.dataset.id = task.id;

    const label = document.createElement('label');
    label.className = 'check';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'check__input';
    checkbox.checked = task.done;
    checkbox.setAttribute(
      'aria-label',
      `${task.done ? 'Mark as not done' : 'Mark as done'}: ${task.text}`
    );

    const box = document.createElement('span');
    box.className = 'check__box';
    box.setAttribute('aria-hidden', 'true');
    box.append(svg(ICONS.check));

    label.append(checkbox, box);
    row.append(label);

    if (state.editingId === task.id) {
      const editor = document.createElement('input');
      editor.type = 'text';
      editor.className = 'task__edit';
      editor.value = task.text;
      editor.maxLength = MAX_LENGTH;
      editor.setAttribute('aria-label', `Edit task: ${task.text}`);
      row.append(editor);

      const hint = document.createElement('span');
      hint.className = 'task__hint';
      hint.textContent = 'Enter to save · Esc to cancel';
      row.append(hint);
    } else {
      const text = document.createElement('span');
      text.className = 'task__text';
      text.textContent = task.text;
      text.title = 'Double-click to edit';
      row.append(text);

      const actions = document.createElement('div');
      actions.className = 'task__actions';
      actions.append(
        iconButton('edit', `Edit task: ${task.text}`, ICONS.pencil),
        iconButton('delete', `Delete task: ${task.text}`, ICONS.trash)
      );
      row.append(actions);
    }

    return row;
  }

  function render() {
    el.list.replaceChildren(...state.tasks.map(taskRow));

    const total = state.tasks.length;
    const remaining = state.tasks.filter((task) => !task.done).length;

    el.list.hidden = total === 0;
    el.toolbar.hidden = total === 0;
    el.empty.hidden = total > 0;
    el.count.textContent = total
      ? `${remaining} of ${total} ${total === 1 ? 'task' : 'tasks'} remaining`
      : '';

    if (state.editingId) {
      const editor = el.list.querySelector('.task__edit');
      if (editor) {
        editor.focus();
        editor.setSelectionRange(editor.value.length, editor.value.length);
      }
    }
  }

  const sync = () => {
    persist();
    render();
  };

  /* ---------------------------------------------------------------- actions */

  function addTask(value) {
    const text = value.trim().slice(0, MAX_LENGTH);
    if (!text) {
      el.input.focus();
      return;
    }
    state.tasks.push({ id: createId(), text, done: false });
    el.input.value = '';
    sync();
    announce(`Added "${text}".`);
    el.input.focus();
  }

  function toggleTask(id) {
    const task = findTask(id);
    if (!task) return;
    task.done = !task.done;
    sync();
    announce(`"${task.text}" marked ${task.done ? 'complete' : 'active'}.`);
  }

  function removeTask(id) {
    const index = state.tasks.findIndex((task) => task.id === id);
    if (index === -1) return;
    const [removed] = state.tasks.splice(index, 1);
    if (state.editingId === id) state.editingId = null;
    sync();
    announce(`Deleted "${removed.text}".`);
    focusAfterRemoval(index);
  }

  function focusRowAction(id, action) {
    const button = el.list.querySelector(`.task[data-id="${id}"] [data-action="${action}"]`);
    if (button) button.focus();
  }

  function focusAfterRemoval(index) {
    const rows = el.list.querySelectorAll('.task');
    const row = rows[Math.min(index, rows.length - 1)];
    const button = row && row.querySelector('[data-action="delete"]');
    (button || el.input).focus();
  }

  function startEdit(id) {
    if (!findTask(id)) return;
    state.editingId = id;
    render();
  }

  function cancelEdit() {
    state.editingId = null;
    render();
  }

  /** Commits `value` to the task being edited. Empty input reverts, never deletes. */
  function commitEdit(value) {
    const task = findTask(state.editingId);
    state.editingId = null;

    if (task) {
      const text = value.trim().slice(0, MAX_LENGTH);
      if (text && text !== task.text) {
        task.text = text;
        persist();
        announce(`Task renamed to "${text}".`);
      }
    }
    render();
  }

  /** Flushes an in-progress edit before another action re-renders the list. */
  function commitPendingEdit() {
    if (!state.editingId) return;
    const editor = el.list.querySelector('.task__edit');
    commitEdit(editor ? editor.value : '');
  }

  function clearAll() {
    const count = state.tasks.length;
    state.tasks = [];
    state.editingId = null;
    sync();
    announce(count === 1 ? '1 task deleted.' : `${count} tasks deleted.`);
    el.input.focus();
  }

  function requestClearAll() {
    const count = state.tasks.length;
    if (!count) return;

    const message = `This deletes ${count === 1 ? 'your only task' : `all ${count} tasks`} from this browser. It can't be undone.`;

    if (typeof el.dialog.showModal === 'function') {
      el.dialogBody.textContent = message;
      el.dialog.returnValue = '';
      el.dialog.showModal();
    } else if (window.confirm(`Clear all tasks?\n\n${message}`)) {
      clearAll();
    }
  }

  /* ----------------------------------------------------------------- events */

  el.form.addEventListener('submit', (event) => {
    event.preventDefault(); // covers both the Add button and the Enter key
    addTask(el.input.value);
  });

  el.clear.addEventListener('click', requestClearAll);

  el.dialog.addEventListener('close', () => {
    if (el.dialog.returnValue === 'confirm') clearAll();
  });

  // While editing, keep focus on the editor during mousedown so the click that
  // follows still lands on its button instead of on a freshly rendered row.
  el.list.addEventListener('mousedown', (event) => {
    if (state.editingId && !event.target.closest('.task__edit')) event.preventDefault();
  });

  el.list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    const row = button && button.closest('.task');
    if (!row) return;

    const { id } = row.dataset;
    const { action } = button.dataset;

    commitPendingEdit();
    if (action === 'edit') startEdit(id);
    else removeTask(id);
  });

  el.list.addEventListener('change', (event) => {
    const row = event.target.closest('.task');
    if (!row || !event.target.classList.contains('check__input')) return;

    const { id } = row.dataset;
    commitPendingEdit();
    toggleTask(id);
  });

  el.list.addEventListener('dblclick', (event) => {
    const text = event.target.closest('.task__text');
    if (text) startEdit(text.closest('.task').dataset.id);
  });

  el.list.addEventListener('keydown', (event) => {
    if (!event.target.classList.contains('task__edit')) return;

    const { id } = event.target.closest('.task').dataset;

    if (event.key === 'Enter') {
      event.preventDefault();
      commitEdit(event.target.value);
      focusRowAction(id, 'edit');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
      focusRowAction(id, 'edit');
    }
  });

  // Clicking or tabbing away saves the edit, matching the inline-edit convention.
  el.list.addEventListener('focusout', (event) => {
    if (event.target.classList.contains('task__edit') && state.editingId) {
      commitEdit(event.target.value);
    }
  });

  /* ------------------------------------------------------------------- init */

  state.tasks = readStored();
  render();
})();
