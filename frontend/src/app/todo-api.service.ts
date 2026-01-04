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
  private activeFetchRequests = 0;

  readonly todos$ = this.todosSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly lastSynced$ = this.lastSyncedSubject.asObservable();

  /** HttpClient を注入して HTTP 通信を行う */
  constructor(private http: HttpClient) {}

  /** 現在保持しているタスク一覧を即時取得する */
  get snapshot(): Todo[] {
    return this.todosSubject.value;
  }

  /** サーバーから最新のタスク一覧を取得して状態を更新する */
  refresh(): Observable<Todo[]> {
    return this.handleRequest(
      this.http.get<Todo[]>(this.baseUrl),
      (todos) => {
        this.todosSubject.next(todos);
        this.lastSyncedSubject.next(new Date().toISOString());
      },
      'タスクの取得に失敗しました。',
      { mode: 'fetch' }
    );
  }

  /** 新しいタスクを作成しローカル状態へ反映する */
  create(title: string): Observable<Todo> {
    return this.handleRequest(
      this.http.post<Todo>(this.baseUrl, { title }),
      (created) => {
        this.todosSubject.next([created, ...this.todosSubject.value]);
      },
      'タスクの追加に失敗しました。'
    );
  }

  /** 指定 ID のタスクを更新し結果をローカルへ反映する */
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

  /** 単一タスクを削除しローカル状態から除外する */
  delete(id: number): Observable<void> {
    return this.handleRequest(
      this.http.delete<void>(`${this.baseUrl}/${id}`),
      () => {
        this.todosSubject.next(this.todosSubject.value.filter((item) => item.id !== id));
      },
      'タスクの削除に失敗しました。'
    );
  }

  /** 全てのタスクを削除し同期時刻を更新する */
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

  /** エラーメッセージをクリアして UI をリセットする */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /** 共通の API 呼び出しロジックをまとめて副作用やエラー処理を行う */
  private handleRequest<T>(
    request: Observable<T>,
    onSuccess: (value: T) => void,
    errorMessage: string,
    options: { mode?: 'fetch' | 'mutate' } = {}
  ): Observable<T> {
    const mode = options.mode ?? 'mutate';
    this.beginRequest(mode);
    return request.pipe(
      tap((value) => {
        onSuccess(value);
        this.errorSubject.next(null);
      }),
      catchError((error) => {
        this.errorSubject.next(errorMessage);
        return throwError(() => error);
      }),
      finalize(() => this.endRequest(mode))
    );
  }

  /** フェッチ系リクエスト開始時のローディング状態を管理する */
  private beginRequest(mode: 'fetch' | 'mutate'): void {
    if (mode === 'fetch') {
      this.activeFetchRequests += 1;
      if (this.activeFetchRequests === 1) {
        this.loadingSubject.next(true);
      }
    }
  }

  /** フェッチ系リクエスト完了時にローディング状態を解消する */
  private endRequest(mode: 'fetch' | 'mutate'): void {
    if (mode === 'fetch') {
      this.activeFetchRequests = Math.max(0, this.activeFetchRequests - 1);
      if (this.activeFetchRequests === 0) {
        this.loadingSubject.next(false);
      }
    }
  }
}
