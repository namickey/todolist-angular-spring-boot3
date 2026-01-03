const apiBase = '/api/todos';

/**
 * 全タスクを取得する。
 * サーバの `/api/todos` から JSON 配列を返す。
 */
async function fetchTodos() {
  const res = await fetch(apiBase);
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

/**
 * 新規タスクを作成する。
 * タイトル文字列を受け取り、作成結果のタスクオブジェクトを返す。
 */
async function createTodo(title) {
  const res = await fetch(apiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Failed to create');
  return res.json();
}

/**
 * 指定IDのタスクを更新する。
 * タイトルまたは完了フラグを更新し、更新後のタスクオブジェクトを返す。
 */
async function updateTodo(id, { title, completed }) {
  const res = await fetch(`${apiBase}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, completed })
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
}

/**
 * 指定IDのタスクを削除する。
 * 成功時はレスポンスボディなし（204）またはOKを想定。
 */
async function deleteTodo(id) {
  const res = await fetch(`${apiBase}/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
}

/**
 * 全タスクを削除する。
 * 成功時はレスポンスボディなし（204）またはOKを想定。
 */
async function deleteAllTodos() {
  const res = await fetch(`${apiBase}`, {
    method: 'DELETE'
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete all');
}

/**
 * 要素ノードを生成するユーティリティ。
 * 属性オブジェクトと子要素からDOMノードを作成する。
 */
function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.substring(2), v);
    else if (v !== undefined && v !== null) e.setAttribute(k, v);
  });
  children.forEach(c => e.append(c instanceof Node ? c : document.createTextNode(c)));
  return e;
}

function renderList(items) {
  const list = document.getElementById('list');
  const completedList = document.getElementById('completed-list');
  list.innerHTML = '';
  completedList.innerHTML = '';

  // IDの昇順で安定表示
  const sorted = items.slice().sort((a, b) => a.id - b.id);

  for (const t of sorted) {
    const checkbox = el('input', { type: 'checkbox' });
    checkbox.checked = !!t.completed;

    const titleSpan = el('span', { class: t.completed ? 'title completed' : 'title editable' });
    titleSpan.textContent = t.title;

    // タイトル編集
    if (!t.completed) {
      titleSpan.addEventListener('click', async () => {
        const newTitle = prompt('タイトルを編集', t.title);
        if (newTitle == null) return;
        const trimmed = newTitle.trim();
        if (!trimmed) return;
        const updated = await updateTodo(t.id, { title: trimmed, completed: t.completed });
        t.title = updated.title; titleSpan.textContent = t.title;
      });
    }

    const delBtn = el('button');
    delBtn.textContent = '削除';
    delBtn.addEventListener('click', async () => {
      await deleteTodo(t.id);
      await refresh();
    });

    const li = el('li', {}, checkbox, titleSpan, el('span', { class: 'spacer' }), delBtn);

    // チェック状態変更でAPI更新し、DOMの所属リストを移動
    checkbox.addEventListener('change', async () => {
      const updated = await updateTodo(t.id, { completed: checkbox.checked, title: t.title });
      t.completed = updated.completed; t.title = updated.title; t.updatedAt = updated.updatedAt;
      titleSpan.classList.toggle('completed', t.completed);
      // 移動: 完了なら completedList、未完了なら list
      if (t.completed) {
        completedList.appendChild(li);
      } else {
        list.appendChild(li);
      }
    });

    // 初期配置
    if (t.completed) {
      completedList.appendChild(li);
    } else {
      list.appendChild(li);
    }
  }
}

/**
 * サーバから最新タスクを取得して画面へ反映する。
 */
async function refresh() {
  const items = await fetchTodos();
  renderList(items);
}

/**
 * アプリ初期化処理。
 * 入力・追加・全削除のイベントを設定し、初回描画を行う。
 */
async function main() {
  const input = document.getElementById('new-title');
  const add = document.getElementById('add');
  const delAll = document.getElementById('delete-all');
  add.addEventListener('click', async () => {
    const title = input.value.trim();
    if (!title) return;
    await createTodo(title);
    input.value = '';
    await refresh();
  });
  delAll.addEventListener('click', async () => {
    await deleteAllTodos();
    await refresh();
  });
  input.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      add.click();
    }
  });
  await refresh();
}

window.addEventListener('DOMContentLoaded', main);
