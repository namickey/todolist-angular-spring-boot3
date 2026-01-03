import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Todo, TodoApiService } from './todo-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'frontend';
  todos: Todo[] = [];
  pendingTodos: Todo[] = [];
  completedTodos: Todo[] = [];
  newTodoTitle = '';
  editingTodoId: number | null = null;
  editingTitle = '';
  loading = false;
  errorMessage?: string;
  lastSyncedAt?: string;

  constructor(private todoApi: TodoApiService) {}

  ngOnInit(): void {
    this.loadTodos();
  }

  get pendingCount(): number {
    return this.pendingTodos.length;
  }

  get completedCount(): number {
    return this.completedTodos.length;
  }

  addTodo(): void {
    const title = this.newTodoTitle.trim();
    if (!title) {
      this.errorMessage = 'タスク名を入力してください。';
      return;
    }

    this.todoApi.create(title).subscribe({
      next: (created) => {
        this.todos = [created, ...this.todos];
        this.updateDerivedTodos();
        this.newTodoTitle = '';
        this.errorMessage = undefined;
      },
      error: () => {
        this.errorMessage = 'タスクの追加に失敗しました。';
      }
    });
  }

  toggleCompleted(todo: Todo): void {
    this.todoApi.update(todo.id, { completed: !todo.completed }).subscribe({
      next: (updated) => this.replaceTodo(updated),
      error: () => {
        this.errorMessage = '完了状態の更新に失敗しました。';
      }
    });
  }

  startEditing(todo: Todo): void {
    this.editingTodoId = todo.id;
    this.editingTitle = todo.title;
  }

  submitEdit(todo: Todo): void {
    if (this.editingTodoId !== todo.id) {
      return;
    }

    const trimmed = this.editingTitle.trim();
    if (!trimmed) {
      this.errorMessage = 'タスク名は空にできません。';
      this.resetEditing();
      return;
    }

    if (trimmed === todo.title) {
      this.resetEditing();
      return;
    }

    this.todoApi.update(todo.id, { title: trimmed }).subscribe({
      next: (updated) => {
        this.replaceTodo(updated);
        this.resetEditing();
      },
      error: () => {
        this.errorMessage = 'タスク名の更新に失敗しました。';
      }
    });
  }

  cancelEditing(): void {
    this.resetEditing();
  }

  deleteTodo(todo: Todo): void {
    this.todoApi.delete(todo.id).subscribe({
      next: () => {
        this.todos = this.todos.filter((item) => item.id !== todo.id);
        this.updateDerivedTodos();
      },
      error: () => {
        this.errorMessage = 'タスクの削除に失敗しました。';
      }
    });
  }

  refresh(): void {
    this.loadTodos();
  }

  clearAll(): void {
    if (!this.todos.length) {
      return;
    }

    this.todoApi.deleteAll().subscribe({
      next: () => {
        this.todos = [];
        this.updateDerivedTodos();
        this.lastSyncedAt = new Date().toISOString();
        this.errorMessage = undefined;
      },
      error: () => {
        this.errorMessage = '全件削除に失敗しました。';
      }
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
    this.loading = true;
    this.todoApi.list().subscribe({
      next: (response) => {
        this.todos = response;
        this.updateDerivedTodos();
        this.lastSyncedAt = new Date().toISOString();
        this.loading = false;
        this.errorMessage = undefined;
      },
      error: () => {
        this.errorMessage = 'タスクの取得に失敗しました。';
        this.loading = false;
      }
    });
  }

  private replaceTodo(updated: Todo): void {
    this.todos = this.todos.map((item) => (item.id === updated.id ? updated : item));
    this.updateDerivedTodos();
    this.errorMessage = undefined;
  }

  private updateDerivedTodos(): void {
    this.pendingTodos = this.todos.filter((todo) => !todo.completed);
    this.completedTodos = this.todos.filter((todo) => todo.completed);
  }
  private resetEditing(): void {
    this.editingTodoId = null;
    this.editingTitle = '';
  }
}
