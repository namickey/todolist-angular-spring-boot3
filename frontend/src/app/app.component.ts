import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { combineLatest, finalize, map, shareReplay } from 'rxjs';

import { Todo, TodoApiService } from './todo-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'frontend';
  newTodoTitle = '';
  editingTodoId: number | null = null;
  editingTitle = '';
  formError?: string;
  isSubmittingNewTodo = false;
  isClearingAll = false;
  private mutatingTodoIds = new Set<number>();

  private readonly pendingTodos$ = this.todoApi.todos$.pipe(
    map((todos) => todos.filter((todo) => !todo.completed)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly completedTodos$ = this.todoApi.todos$.pipe(
    map((todos) => todos.filter((todo) => todo.completed)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly pendingCount$ = this.pendingTodos$.pipe(
    map((todos) => todos.length),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly completedCount$ = this.completedTodos$.pipe(
    map((todos) => todos.length),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly totalCount$ = combineLatest([this.pendingCount$, this.completedCount$]).pipe(
    map(([pending, completed]) => pending + completed),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly viewModel$ = combineLatest({
    loading: this.todoApi.loading$,
    pendingTodos: this.pendingTodos$,
    completedTodos: this.completedTodos$,
    pendingCount: this.pendingCount$,
    completedCount: this.completedCount$,
    totalCount: this.totalCount$,
    errorMessage: this.todoApi.error$,
    lastSyncedAt: this.todoApi.lastSynced$
  });

  constructor(private todoApi: TodoApiService) {}

  /** 初期表示時にタスク一覧を取得する */
  ngOnInit(): void {
    this.loadTodos();
  }

  /** 新しいタスクを追加する */
  addTodo(): void {
    const title = this.newTodoTitle.trim();
    if (!title) {
      this.formError = 'タスク名を入力してください。';
      return;
    }

    this.isSubmittingNewTodo = true;
    this.todoApi
      .create(title)
      .pipe(finalize(() => (this.isSubmittingNewTodo = false)))
      .subscribe({
      next: () => {
        this.newTodoTitle = '';
        this.formError = undefined;
      },
      error: () => {
        // エラーメッセージはサービス側で管理
      }
      });
  }

  /** 完了状態をトグルする */
  toggleCompleted(todo: Todo): void {
    this.setTodoMutating(todo.id, true);
    this.todoApi
      .update(todo.id, { completed: !todo.completed }, '完了状態の更新に失敗しました。')
      .pipe(finalize(() => this.setTodoMutating(todo.id, false)))
      .subscribe({
        next: () => {
          this.formError = undefined;
        },
        error: () => {}
      });
  }

  /** 編集開始時に対象の情報を保持する */
  startEditing(todo: Todo): void {
    this.editingTodoId = todo.id;
    this.editingTitle = todo.title;
    this.formError = undefined;
  }

  /** 編集内容をAPIへ送信する */
  submitEdit(todo: Todo): void {
    if (this.editingTodoId !== todo.id) {
      return;
    }

    const trimmed = this.editingTitle.trim();
    if (!trimmed) {
      this.formError = 'タスク名は空にできません。';
      this.resetEditing();
      return;
    }

    if (trimmed === todo.title) {
      this.resetEditing();
      return;
    }

    this.setTodoMutating(todo.id, true);
    this.todoApi
      .update(todo.id, { title: trimmed }, 'タスク名の更新に失敗しました。')
      .pipe(
        finalize(() => {
          this.setTodoMutating(todo.id, false);
        })
      )
      .subscribe({
        next: () => {
          this.resetEditing();
          this.formError = undefined;
        },
        error: () => {}
      });
  }

  /** 編集モードをキャンセルする */
  cancelEditing(): void {
    this.resetEditing();
  }

  /** 単一タスクを削除する */
  deleteTodo(todo: Todo): void {
    this.setTodoMutating(todo.id, true);
    this.todoApi
      .delete(todo.id)
      .pipe(finalize(() => this.setTodoMutating(todo.id, false)))
      .subscribe({
        next: () => {
          this.formError = undefined;
        },
        error: () => {}
      });
  }

  /** 最新状態へ再読み込みする */
  refresh(): void {
    this.loadTodos();
  }

  /** すべてのタスクをクリアする */
  clearAll(): void {
    if (!this.todoApi.snapshot.length) {
      return;
    }

    this.isClearingAll = true;
    this.todoApi
      .deleteAll()
      .pipe(finalize(() => (this.isClearingAll = false)))
      .subscribe({
        next: () => {
          this.formError = undefined;
        },
        error: () => {}
      });
  }

  /** 日付文字列を表示用に整形する */
  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return new Intl.DateTimeFormat('ja-JP', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  trackByTodo(_: number, todo: Todo): number {
    return todo.id;
  }

  /** API からタスク一覧を取得する */
  private loadTodos(): void {
    this.todoApi.refresh().subscribe({
      next: () => {
        this.formError = undefined;
      },
      error: () => {}
    });
  }

  isTodoMutating(id: number): boolean {
    return this.mutatingTodoIds.has(id);
  }

  /** 指定IDの更新状態をセットする */
  private setTodoMutating(id: number, mutating: boolean): void {
    if (mutating) {
      this.mutatingTodoIds.add(id);
    } else {
      this.mutatingTodoIds.delete(id);
    }
  }

  /** 編集用フィールドを初期化する */
  private resetEditing(): void {
    this.editingTodoId = null;
    this.editingTitle = '';
  }
}
