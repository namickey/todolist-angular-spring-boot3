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

  ngOnInit(): void {
    this.loadTodos();
  }

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

  startEditing(todo: Todo): void {
    this.editingTodoId = todo.id;
    this.editingTitle = todo.title;
    this.formError = undefined;
  }

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

  cancelEditing(): void {
    this.resetEditing();
  }

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

  refresh(): void {
    this.loadTodos();
  }

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

  private setTodoMutating(id: number, mutating: boolean): void {
    if (mutating) {
      this.mutatingTodoIds.add(id);
    } else {
      this.mutatingTodoIds.delete(id);
    }
  }
  private resetEditing(): void {
    this.editingTodoId = null;
    this.editingTitle = '';
  }
}
