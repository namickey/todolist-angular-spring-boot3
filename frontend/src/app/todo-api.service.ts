import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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

  constructor(private http: HttpClient) {}

  list(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.baseUrl);
  }

  create(title: string): Observable<Todo> {
    return this.http.post<Todo>(this.baseUrl, { title });
  }

  update(id: number, payload: TodoUpdatePayload): Observable<Todo> {
    return this.http.put<Todo>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  deleteAll(): Observable<void> {
    return this.http.delete<void>(this.baseUrl);
  }
}
