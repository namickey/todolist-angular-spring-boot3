import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, tap, throwError } from 'rxjs';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TodoUpdatePayload {
  title?: string;
  completed?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TodoApiService {
  private readonly baseUrl = '/api/todos';
  private readonly todosSubject = new BehaviorSubject<Todo[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly lastSyncedSubject = new BehaviorSubject<string | null>(null);
  private activeRequests = 0;

  readonly todos$ = this.todosSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly lastSynced$ = this.lastSyncedSubject.asObservable();

  constructor(private http: HttpClient) {}

  get snapshot(): Todo[] {
    return this.todosSubject.value;
  }

  refresh(): Observable<Todo[]> {
    return this.handleRequest(
      this.http.get<Todo[]>(this.baseUrl),
      (todos) => {
        this.todosSubject.next(todos);
        this.lastSyncedSubject.next(new Date().toISOString());
      },
      'タスクの取得に失敗しました。'
    );
  }

  create(title: string): Observable<Todo> {
    return this.handleRequest(
      this.http.post<Todo>(this.baseUrl, { title }),
      (created) => {
        this.todosSubject.next([created, ...this.todosSubject.value]);
      },
      'タスクの追加に失敗しました。'
    );
  }

  update(id: number, payload: TodoUpdatePayload, errorMessage = 'タスクの更新に失敗しました。'): Observable<Todo> {
    return this.handleRequest(
      this.http.put<Todo>(`${this.baseUrl}/${id}`, payload),
      (updated) => {
        this.todosSubject.next(
          this.todosSubject.value.map((item) => (item.id === updated.id ? updated : item))
        );
      },
      errorMessage
    );
  }

  delete(id: number): Observable<void> {
    return this.handleRequest(
      this.http.delete<void>(`${this.baseUrl}/${id}`),
      () => {
        this.todosSubject.next(this.todosSubject.value.filter((item) => item.id !== id));
      },
      'タスクの削除に失敗しました。'
    );
  }

  deleteAll(): Observable<void> {
    return this.handleRequest(
      this.http.delete<void>(this.baseUrl),
      () => {
        this.todosSubject.next([]);
        this.lastSyncedSubject.next(new Date().toISOString());
      },
      '全件削除に失敗しました。'
    );
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  private handleRequest<T>(request: Observable<T>, onSuccess: (value: T) => void, errorMessage: string): Observable<T> {
    this.beginRequest();
    return request.pipe(
      tap((value) => {
        onSuccess(value);
        this.errorSubject.next(null);
      }),
      catchError((error) => {
        this.errorSubject.next(errorMessage);
        return throwError(() => error);
      }),
      finalize(() => this.endRequest())
    );
  }

  private beginRequest(): void {
    this.activeRequests += 1;
    if (this.activeRequests === 1) {
      this.loadingSubject.next(true);
    }
  }

  private endRequest(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      this.loadingSubject.next(false);
    }
  }
}
